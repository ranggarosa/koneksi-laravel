<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Enforces Constitution Principle II: 4 seeded sample accounts with password 'password'.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Administrator Sistem',
                'email' => 'admin@koneksi.local',
                'password' => Hash::make('password'),
                'role' => User::ROLE_ADMIN,
                'is_active' => true,
            ],
            [
                'name' => 'Staf Konseptor (Drafter)',
                'email' => 'drafter@koneksi.local',
                'password' => Hash::make('password'),
                'role' => User::ROLE_DRAFTER,
                'is_active' => true,
            ],
            [
                'name' => 'Pejabat Peninjau (Reviewer)',
                'email' => 'reviewer@koneksi.local',
                'password' => Hash::make('password'),
                'role' => User::ROLE_REVIEWER,
                'is_active' => true,
            ],
            [
                'name' => 'Pejabat Penandatangan (Approver)',
                'email' => 'approver@koneksi.local',
                'password' => Hash::make('password'),
                'role' => User::ROLE_APPROVER,
                'is_active' => true,
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                $user
            );
        }

        // Also seed default letter templates
        $this->call(LetterTemplateSeeder::class);
    }
}
