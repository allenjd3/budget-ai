<?php

namespace App\Http\Controllers\Teams;

use App\Actions\Teams\CreateTeam;
use App\Enums\TeamRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Teams\DeleteTeamRequest;
use App\Http\Requests\Teams\SaveTeamRequest;
use App\Models\Membership;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TeamController extends Controller
{
    /**
     * Display a listing of the user's teams.
     */
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return Inertia::render('teams/index', [
            'teams' => $user->toUserTeams(includeCurrent: true),
        ]);
    }

    /**
     * Store a newly created team.
     */
    public function store(SaveTeamRequest $request, CreateTeam $createTeam): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var string $name */
        $name = $request->validated('name');

        $team = $createTeam->handle($user, $name);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    /**
     * Show the team edit page.
     */
    public function edit(Request $request, Team $team): Response
    {
        /** @var User $user */
        $user = $request->user();

        return Inertia::render('teams/edit', [
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
                'slug' => $team->slug,
                'isPersonal' => $team->is_personal,
            ],
            'members' => $team->memberships()
                ->with('user')
                ->get()
                ->map(fn (Membership $membership) => [
                    'id' => $membership->user?->id,
                    'name' => $membership->user?->name,
                    'email' => $membership->user?->email,
                    'role' => $membership->role?->value,
                    'role_label' => $membership->role?->label(),
                ]),
            'invitations' => $team->invitations()
                ->whereNull('accepted_at')
                ->get()
                ->map(fn (TeamInvitation $invitation) => [
                    'code' => $invitation->code,
                    'email' => $invitation->email,
                    'role' => $invitation->role?->value,
                    'role_label' => $invitation->role?->label(),
                    'created_at' => $invitation->created_at?->toISOString(),
                ]),
            'permissions' => $user->toTeamPermissions($team),
            'availableRoles' => TeamRole::assignable(),
        ]);
    }

    /**
     * Update the specified team.
     */
    public function update(SaveTeamRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('update', $team);

        $team = DB::transaction(function () use ($request, $team) {
            $team = Team::whereKey($team->id)->lockForUpdate()->firstOrFail();

            $team->update(['name' => $request->validated('name')]);

            return $team;
        });

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    /**
     * Switch the user's current team.
     */
    public function switch(Request $request, Team $team): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        abort_unless($user->belongsToTeam($team), 403);

        $user->switchTeam($team);

        return back();
    }

    /**
     * Delete the specified team.
     */
    public function destroy(DeleteTeamRequest $request, Team $team): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();

        $fallbackTeam = $user->isCurrentTeam($team)
            ? $user->fallbackTeam($team)
            : null;

        DB::transaction(function () use ($user, $team) {
            User::where('current_team_id', $team->id)
                ->where('id', '!=', $user->id)
                ->each(function (User $affectedUser): void {
                    $personalTeam = $affectedUser->personalTeam();
                    if ($personalTeam !== null) {
                        $affectedUser->switchTeam($personalTeam);
                    }
                });

            $team->invitations()->delete();
            $team->memberships()->delete();
            $team->delete();
        });

        if ($fallbackTeam) {
            $user->switchTeam($fallbackTeam);
        }

        return to_route('teams.index');
    }
}
