<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_sample_users_seeded_and_can_login(): void
    {
        $this->seed(DatabaseSeeder::class);

        $accounts = [
            'admin@koneksi.local',
            'drafter@koneksi.local',
            'reviewer@koneksi.local',
            'approver@koneksi.local',
        ];

        foreach ($accounts as $email) {
            $response = $this->post(route('login'), [
                'email' => $email,
                'password' => 'password',
            ]);

            $response->assertRedirect(route('dashboard'));
            $this->assertAuthenticated();

            $this->post(route('logout'));
            $this->assertGuest();
        }
    }

    public function test_inactive_user_cannot_login(): void
    {
        $inactive = User::factory()->create([
            'email' => 'disabled@koneksi.local',
            'is_active' => false,
        ]);

        $response = $this->post(route('login'), [
            'email' => 'disabled@koneksi.local',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertGuest();
    }

    public function test_quick_switch_user_works_in_local_environment(): void
    {
        $this->seed(DatabaseSeeder::class);

        $response = $this->post(route('dev.switch-user', ['role' => 'approver']));
        $response->assertRedirect();

        $this->assertAuthenticated();
        $this->assertEquals(User::ROLE_APPROVER, Auth::user()->role);
    }

    public function test_quick_switch_user_is_forbidden_in_production(): void
    {
        $this->app['env'] = 'production';

        $response = $this->post('/dev/switch-user/approver');
        $response->assertNotFound();
    }
}
