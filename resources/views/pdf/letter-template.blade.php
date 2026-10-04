<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $letter->reference_number ?? 'Naskah Dinas' }}</title>
    <style>
        @page {
            size: a4 portrait;
            margin: 2.5cm 2cm 2cm 2cm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            color: #1e293b;
            line-height: 1.5;
            font-size: 11pt;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 24px;
        }
        .org-title {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0f172a;
        }
        .org-subtitle {
            font-size: 9pt;
            color: #475569;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 20px;
        }
        .meta-table td {
            vertical-align: top;
            padding: 2px 0;
            font-size: 10.5pt;
        }
        .meta-label {
            width: 15%;
            color: #334155;
        }
        .meta-separator {
            width: 3%;
        }
        .meta-value {
            width: 45%;
            font-weight: 500;
        }
        .meta-date {
            width: 37%;
            text-align: right;
        }
        .content-body {
            margin-top: 24px;
            margin-bottom: 36px;
            text-align: justify;
        }
        .signature-table {
            width: 100%;
            margin-top: 40px;
            page-break-inside: avoid;
        }
        .signature-box {
            width: 45%;
            text-align: center;
        }
        .signature-space {
            height: 70px;
            padding-top: 10px;
        }
        .digital-badge {
            display: inline-block;
            border: 1px dashed #2563eb;
            background-color: #eff6ff;
            color: #1e40af;
            font-size: 8pt;
            padding: 6px 12px;
            border-radius: 4px;
        }
        .signer-name {
            font-weight: bold;
            text-decoration: underline;
            color: #0f172a;
        }
        .signer-role {
            font-size: 9.5pt;
            color: #475569;
        }
        .footer-note {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 8pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 4px;
        }
    </style>
</head>
<body>
    {{-- Kop Surat / Header --}}
    <table class="header-table">
        <tr>
            <td style="width: 100%; text-align: center;">
                <div class="org-title">KONEKSI INDONESIA</div>
                <div class="org-subtitle">Sistem Pengelolaan Naskah Dinas & Administrasi Terpadu</div>
                <div class="org-subtitle">Jakarta, Indonesia &bull; https://koneksi.local</div>
            </td>
        </tr>
    </table>

    {{-- Metadata Section --}}
    <table class="meta-table">
        <tr>
            <td class="meta-label">Nomor</td>
            <td class="meta-separator">:</td>
            <td class="meta-value"><strong>{{ $letter->reference_number }}</strong></td>
            <td class="meta-date">Jakarta, {{ $letter->letter_date ? $letter->letter_date->format('d F Y') : date('d F Y') }}</td>
        </tr>
        <tr>
            <td class="meta-label">Lampiran</td>
            <td class="meta-separator">:</td>
            <td class="meta-value">-</td>
            <td></td>
        </tr>
        <tr>
            <td class="meta-label">Perihal</td>
            <td class="meta-separator">:</td>
            <td class="meta-value">{{ $letter->subject }}</td>
            <td></td>
        </tr>
    </table>

    <div style="margin-top: 16px;">
        Kepada Yth.<br>
        <strong>{{ $letter->recipient }}</strong><br>
        di Tempat
    </div>

    {{-- Body Content --}}
    <div class="content-body">
        <p>Dengan hormat,</p>
        
        <p>
            Sehubungan dengan {{ strtolower($letter->subject) }}, bersama surat ini kami sampaikan informasi resmi sebagai berikut:
        </p>

        @if (! empty($letter->content_data))
            <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
                @foreach ($letter->content_data as $key => $val)
                    <tr>
                        <td style="width: 30%; padding: 4px 0; vertical-align: top; color: #475569;">
                            {{ ucwords(str_replace('_', ' ', $key)) }}
                        </td>
                        <td style="width: 3%; padding: 4px 0; vertical-align: top;">:</td>
                        <td style="width: 67%; padding: 4px 0; vertical-align: top; font-weight: 500;">
                            {{ is_array($val) ? json_encode($val) : $val }}
                        </td>
                    </tr>
                @endforeach
            </table>
        @endif

        <p>
            Demikian naskah dinas ini dibuat untuk dapat dipergunakan sebagaimana mestinya dan sesuai dengan ketentuan peraturan yang berlaku.
        </p>
    </div>

    {{-- Signature Section --}}
    @php
        $approverStep = $letter->workflows?->firstWhere('role_type', 'approver');
        $approverUser = $approverStep?->user;
    @endphp

    <table class="signature-table">
        <tr>
            <td style="width: 55%;"></td>
            <td class="signature-box">
                <div>Pejabat Penandatangan,</div>
                <div class="signature-space">
                    @if ($letter->signature_type === 'digital')
                        <div class="digital-badge">
                            TANDATANGAN ELEKTRONIK TERVERIFIKASI<br>
                            Ref: {{ $letter->reference_number }}<br>
                            Waktu: {{ now()->format('d/m/Y H:i') }} WIB
                        </div>
                    @else
                        <div style="font-size: 8pt; color: #94a3b8; padding-top: 25px;">
                            (Tanda Tangan Fisik / Basah)
                        </div>
                    @endif
                </div>
                <div class="signer-name">{{ $approverUser?->name ?? 'Pejabat Berwenang' }}</div>
                <div class="signer-role">{{ $approverUser?->email ?? 'Approver' }}</div>
            </td>
        </tr>
    </table>

    {{-- Footer --}}
    <div class="footer-note">
        Dokumen ini diterbitkan secara sah melalui Sistem Koneksi Naskah Dinas. Keabsahan naskah dinas dapat diverifikasi melalui nomor referensi resmi.
    </div>
</body>
</html>
