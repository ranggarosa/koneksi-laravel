<?php

namespace Database\Seeders;

use App\Models\LetterTemplate;
use Illuminate\Database\Seeder;

class LetterTemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $templates = [
            [
                'code' => 'SKK',
                'name' => 'Surat Keterangan Kerja',
                'description' => 'Surat Keterangan Kerja resmi untuk pegawai / karyawan',
                'content_schema' => [
                    'employee_name' => 'string',
                    'employee_id' => 'string',
                    'department' => 'string',
                    'start_date' => 'date',
                    'purpose' => 'string',
                ],
                'default_tiers' => ['approver'],
                'is_active' => true,
            ],
            [
                'code' => 'SP1',
                'name' => 'Surat Peringatan 1',
                'description' => 'Surat Peringatan Pertama untuk penegakan disiplin',
                'content_schema' => [
                    'employee_name' => 'string',
                    'infraction_date' => 'date',
                    'infraction_detail' => 'string',
                    'sanction' => 'string',
                ],
                'default_tiers' => ['reviewer', 'approver'],
                'is_active' => true,
            ],
            [
                'code' => 'SK',
                'name' => 'Surat Keputusan',
                'description' => 'Surat Keputusan penetapan kebijakan, mutasi, atau pengangkatan',
                'content_schema' => [
                    'decision_title' => 'string',
                    'legal_basis' => 'string',
                    'stipulation' => 'string',
                ],
                'default_tiers' => ['reviewer', 'approver'],
                'is_active' => true,
            ],
            [
                'code' => 'PKS',
                'name' => 'Perjanjian Kerja Sama',
                'description' => 'Perjanjian Kerja Sama resmi dengan pihak mitra eksternal',
                'content_schema' => [
                    'partner_entity' => 'string',
                    'cooperation_scope' => 'string',
                    'effective_period' => 'string',
                ],
                'default_tiers' => ['approver'],
                'is_active' => true,
            ],
        ];

        foreach ($templates as $tmpl) {
            LetterTemplate::updateOrCreate(
                ['code' => $tmpl['code']],
                $tmpl
            );
        }
    }
}
