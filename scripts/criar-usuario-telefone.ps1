$ErrorActionPreference = 'Stop'

$projectUrl = (Read-Host 'URL do projeto (https://SEU-PROJETO.supabase.co)').Trim().TrimEnd('/')
if ($projectUrl -cnotmatch '^https://[a-z0-9-]+\.supabase\.co$') {
    throw 'Use a URL do projeto hospedado no Supabase.'
}

$phone = (Read-Host 'Telefone com DDI, somente + e numeros (ex. +5585999990000)').Trim()
if ($phone -notmatch '^\+[1-9][0-9]{7,14}$') {
    throw 'Informe o telefone no formato internacional.'
}

$name = (Read-Host 'Nome da pessoa').Trim()
$password = Read-Host 'Senha da conta' -AsSecureString
if ($password.Length -eq 0 -or $password.Length -gt 200) {
    throw 'Informe uma senha com ate 200 caracteres.'
}

$privateKey = Read-Host 'Chave secreta do Supabase (sb_secret_...)' -AsSecureString

try {
    $key = [System.Net.NetworkCredential]::new('', $privateKey).Password.Trim()
    if ($key -cnotmatch '^sb_secret_[A-Za-z0-9_-]+$') {
        throw 'Use a chave secreta sb_secret_ do seu projeto.'
    }

    $body = @{
        phone = $phone
        phone_confirm = $true
        password = [System.Net.NetworkCredential]::new('', $password).Password
        user_metadata = @{ name = $name }
    } | ConvertTo-Json -Depth 3 -Compress

    try {
        $user = Invoke-RestMethod -Method Post -Uri "$projectUrl/auth/v1/admin/users" `
            -Headers @{ apikey = $key } -ContentType 'application/json; charset=utf-8' `
            -Body ([Text.Encoding]::UTF8.GetBytes($body)) -MaximumRedirection 0 -TimeoutSec 30
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'sem resposta' }
        throw "Cadastro recusado ($status). Confira em Authentication > Users se o telefone ja existe e revise a chave e a politica de senha."
    }
    if (-not $user.id) {
        throw 'O Supabase nao retornou o ID da conta. Confira em Authentication > Users.'
    }
    Write-Host "Conta criada. ID $($user.id). Agora execute criar-empresa-telefone.sql no Supabase."
} finally {
    $privateKey.Dispose()
    $password.Dispose()
    Remove-Variable -Name key,body -ErrorAction SilentlyContinue
}
