<?php

namespace App\Notifications\Teams;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\TeamInvitation as TeamInvitationModel;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TeamInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public TeamInvitationModel $invitation)
    {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        /** @var Team $team */
        $team = $this->invitation->team;

        /** @var User $inviter */
        $inviter = $this->invitation->inviter;

        return (new MailMessage)
            ->subject("You've been invited to join {$team->name}")
            ->line("{$inviter->name} has invited you to join the {$team->name} team.")
            ->action('Accept invitation', url("/invitations/{$this->invitation->code}/accept"));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        /** @var Team $team */
        $team = $this->invitation->team;

        /** @var TeamRole $role */
        $role = $this->invitation->role;

        return [
            'invitation_id' => $this->invitation->id,
            'team_id' => $this->invitation->team_id,
            'team_name' => $team->name,
            'role' => $role->value,
        ];
    }
}
