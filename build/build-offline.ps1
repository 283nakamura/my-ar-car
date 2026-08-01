<#
Dream On AirTaxi Player
完全オフラインHTML生成スクリプト

処理内容:
1. 開発用HTMLを読み込む
2. ローカルJavaScriptをscriptタグ内へ埋め込む
3. CSSファイルがあればstyleタグ内へ埋め込む
4. 動画、画像、音声、GLBをBase64データURIへ変換する
5. 単一HTMLとしてdistフォルダへ出力する
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'


# ============================================================
# パス設定
# ============================================================

$ScriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDirectory

$SourceHtmlPath = Join-Path $ProjectRoot 'index-source.html'
$OutputDirectory = Join-Path $ProjectRoot 'dist'
$OutputHtmlPath = Join-Path $OutputDirectory 'AirTaxi_Offline.html'


# ============================================================
# MIMEタイプ
# ============================================================

$MimeTypes = @{
    '.mp4'  = 'video/mp4'
    '.webm' = 'video/webm'

    '.mp3'  = 'audio/mpeg'
    '.wav'  = 'audio/wav'
    '.ogg'  = 'audio/ogg'

    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.svg'  = 'image/svg+xml'

    '.glb'  = 'model/gltf-binary'
    '.gltf' = 'model/gltf+json'

    '.bin'  = 'application/octet-stream'
}


# ============================================================
# 共通関数
# ============================================================

function Write-Step {
    param(
        [Parameter(Mandatory)]
        [string] $Message
    )

    Write-Host ""
    Write-Host "============================================================"
    Write-Host $Message
    Write-Host "============================================================"
}


function Resolve-ProjectFile {
    param(
        [Parameter(Mandatory)]
        [string] $RelativePath
    )

    $DecodedPath = [System.Uri]::UnescapeDataString($RelativePath)

    $NormalizedPath = $DecodedPath `
        -replace '/', [System.IO.Path]::DirectorySeparatorChar `
        -replace '\\', [System.IO.Path]::DirectorySeparatorChar

    return Join-Path $ProjectRoot $NormalizedPath
}


function Convert-FileToDataUri {
    param(
        [Parameter(Mandatory)]
        [string] $FilePath,

        [Parameter(Mandatory)]
        [string] $MimeType
    )

    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        throw "アセットファイルが見つかりません: $FilePath"
    }

    $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $Base64 = [System.Convert]::ToBase64String($Bytes)

    return "data:$MimeType;base64,$Base64"
}


function Test-IsExternalReference {
    param(
        [Parameter(Mandatory)]
        [string] $Reference
    )

    return (
        $Reference.StartsWith('http://') -or
        $Reference.StartsWith('https://') -or
        $Reference.StartsWith('//') -or
        $Reference.StartsWith('data:') -or
        $Reference.StartsWith('blob:') -or
        $Reference.StartsWith('#') -or
        $Reference.StartsWith('javascript:') -or
        $Reference.StartsWith('mailto:')
    )
}


# ============================================================
# 入力確認
# ============================================================

Write-Step '入力ファイルを確認しています'

if (-not (Test-Path -LiteralPath $SourceHtmlPath -PathType Leaf)) {
    throw "開発用HTMLが見つかりません: $SourceHtmlPath"
}

if (-not (Test-Path -LiteralPath $OutputDirectory)) {
    New-Item `
        -ItemType Directory `
        -Path $OutputDirectory `
        -Force |
        Out-Null
}

Write-Host "入力: $SourceHtmlPath"
Write-Host "出力: $OutputHtmlPath"


# ============================================================
# HTML読み込み
# ============================================================

Write-Step '開発用HTMLを読み込んでいます'

$Html = [System.IO.File]::ReadAllText(
    $SourceHtmlPath,
    [System.Text.Encoding]::UTF8
)


# ============================================================
# ローカルJavaScriptのインライン化
# ============================================================

Write-Step 'JavaScriptをHTMLへ埋め込んでいます'

$ScriptPattern = '<script\b(?<before>[^>]*?)\bsrc\s*=\s*["''](?<src>[^"'']+)["''](?<after>[^>]*)>\s*</script>'

$Html = [System.Text.RegularExpressions.Regex]::Replace(
    $Html,
    $ScriptPattern,
    {
        param($Match)

        $Source = $Match.Groups['src'].Value

        if (Test-IsExternalReference $Source) {
            Write-Warning "外部JavaScript参照を残します: $Source"
            return $Match.Value
        }

        $ScriptPath = Resolve-ProjectFile $Source

        if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
            throw "JavaScriptファイルが見つかりません: $Source"
        }

        Write-Host "埋め込み: $Source"

        $ScriptContent = [System.IO.File]::ReadAllText(
            $ScriptPath,
            [System.Text.Encoding]::UTF8
        )

        # script内に終了タグ文字列が含まれる場合の保護
        $ScriptContent = $ScriptContent -replace '</script>', '<\/script>'

        return @"
<script>
/* Embedded from: $Source */
$ScriptContent
</script>
"@
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)


# ============================================================
# 外部CSSのインライン化
# ============================================================

Write-Step 'CSSをHTMLへ埋め込んでいます'

$CssPattern = '<link\b(?=[^>]*\brel\s*=\s*["'']stylesheet["''])(?<attributes>[^>]*?)\bhref\s*=\s*["''](?<href>[^"'']+)["''](?<after>[^>]*)>'

$Html = [System.Text.RegularExpressions.Regex]::Replace(
    $Html,
    $CssPattern,
    {
        param($Match)

        $Source = $Match.Groups['href'].Value

        if (Test-IsExternalReference $Source) {
            Write-Warning "外部CSS参照を残します: $Source"
            return $Match.Value
        }

        $CssPath = Resolve-ProjectFile $Source

        if (-not (Test-Path -LiteralPath $CssPath -PathType Leaf)) {
            throw "CSSファイルが見つかりません: $Source"
        }

        Write-Host "埋め込み: $Source"

        $CssContent = [System.IO.File]::ReadAllText(
            $CssPath,
            [System.Text.Encoding]::UTF8
        )

        return @"
<style>
/* Embedded from: $Source */
$CssContent
</style>
"@
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)


# ============================================================
# src属性のアセットをBase64化
# ============================================================

Write-Step '動画・画像・音声・3DモデルをBase64化しています'

$SourceAttributePattern = '(?<prefix>\bsrc\s*=\s*["''])(?<src>[^"'']+)(?<suffix>["''])'

$ProcessedAssets = New-Object 'System.Collections.Generic.Dictionary[string,string]'

$Html = [System.Text.RegularExpressions.Regex]::Replace(
    $Html,
    $SourceAttributePattern,
    {
        param($Match)

        $Reference = $Match.Groups['src'].Value

        if (Test-IsExternalReference $Reference) {
            return $Match.Value
        }

        $PathWithoutQuery = ($Reference -split '[?#]')[0]
        $Extension = [System.IO.Path]::GetExtension($PathWithoutQuery).ToLowerInvariant()

        if (-not $MimeTypes.ContainsKey($Extension)) {
            return $Match.Value
        }

        if ($ProcessedAssets.ContainsKey($Reference)) {
            $DataUri = $ProcessedAssets[$Reference]
        }
        else {
            $AssetPath = Resolve-ProjectFile $PathWithoutQuery
            $MimeType = $MimeTypes[$Extension]

            Write-Host "Base64化: $Reference"

            $DataUri = Convert-FileToDataUri `
                -FilePath $AssetPath `
                -MimeType $MimeType

            $ProcessedAssets.Add($Reference, $DataUri)
        }

        return (
            $Match.Groups['prefix'].Value +
            $DataUri +
            $Match.Groups['suffix'].Value
        )
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)


# ============================================================
# poster属性もBase64化
# ============================================================

$PosterAttributePattern = '(?<prefix>\bposter\s*=\s*["''])(?<src>[^"'']+)(?<suffix>["''])'

$Html = [System.Text.RegularExpressions.Regex]::Replace(
    $Html,
    $PosterAttributePattern,
    {
        param($Match)

        $Reference = $Match.Groups['src'].Value

        if (Test-IsExternalReference $Reference) {
            return $Match.Value
        }

        $PathWithoutQuery = ($Reference -split '[?#]')[0]
        $Extension = [System.IO.Path]::GetExtension($PathWithoutQuery).ToLowerInvariant()

        if (-not $MimeTypes.ContainsKey($Extension)) {
            return $Match.Value
        }

        $AssetPath = Resolve-ProjectFile $PathWithoutQuery
        $MimeType = $MimeTypes[$Extension]

        Write-Host "Base64化: $Reference"

        $DataUri = Convert-FileToDataUri `
            -FilePath $AssetPath `
            -MimeType $MimeType

        return (
            $Match.Groups['prefix'].Value +
            $DataUri +
            $Match.Groups['suffix'].Value
        )
    },
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)


# ============================================================
# 外部参照チェック
# ============================================================

Write-Step '未解決の外部参照を確認しています'

$Warnings = New-Object 'System.Collections.Generic.List[string]'

$ReferencePatterns = @(
    '\bsrc\s*=\s*["''](?<value>[^"'']+)["'']',
    '\bhref\s*=\s*["''](?<value>[^"'']+)["'']',
    '\bposter\s*=\s*["''](?<value>[^"'']+)["'']'
)

foreach ($Pattern in $ReferencePatterns) {
    $Matches = [System.Text.RegularExpressions.Regex]::Matches(
        $Html,
        $Pattern,
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    foreach ($ReferenceMatch in $Matches) {
        $Value = $ReferenceMatch.Groups['value'].Value

        if (
            $Value.StartsWith('http://') -or
            $Value.StartsWith('https://') -or
            $Value.StartsWith('//')
        ) {
            $Warnings.Add("外部URLが残っています: $Value")
        }
        elseif (
            -not $Value.StartsWith('data:') -and
            -not $Value.StartsWith('#') -and
            -not $Value.StartsWith('javascript:') -and
            -not $Value.StartsWith('mailto:')
        ) {
            $Warnings.Add("ローカル参照が残っている可能性があります: $Value")
        }
    }
}

if ($Warnings.Count -gt 0) {
    foreach ($WarningMessage in $Warnings | Select-Object -Unique) {
        Write-Warning $WarningMessage
    }
}
else {
    Write-Host '未解決の外部参照は見つかりませんでした。'
}


# ============================================================
# 出力
# ============================================================

Write-Step '完全オフラインHTMLを書き出しています'

[System.IO.File]::WriteAllText(
    $OutputHtmlPath,
    $Html,
    [System.Text.UTF8Encoding]::new($false)
)

$OutputFile = Get-Item -LiteralPath $OutputHtmlPath

$SizeMb = [Math]::Round(
    $OutputFile.Length / 1MB,
    2
)

Write-Host ""
Write-Host "生成完了"
Write-Host "ファイル: $OutputHtmlPath"
Write-Host "サイズ: $SizeMb MB"
Write-Host ""
Write-Host "このHTMLをネットワーク接続なしで開いて確認してください。"
