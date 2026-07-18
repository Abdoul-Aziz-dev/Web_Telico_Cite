# Vérifie si Node.js et npm sont installés, installe Node.js LTS via winget si nécessaire,
# puis exécute npm install dans le dossier courant.

function Write-Status {
    param([string]$Message)
    Write-Host "[setup-node] $Message"
}

function Has-Command {
    param([string]$Command)
    return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

function Install-Node {
    Write-Status "Installation de Node.js LTS avec winget..."
    winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements -e
    return $LASTEXITCODE -eq 0
}

function Get-NodeVersion {
    try {
        $nodeVersion = node -v 2>$null
        $npmVersion = npm -v 2>$null
        return @{ Node = $nodeVersion; Npm = $npmVersion }
    } catch {
        return $null
    }
}

Write-Status "Vérification de l'installation de Node.js..."

if (Has-Command node -or $env:PATH -match 'nodejs') {
    try {
        $versions = Get-NodeVersion
        if ($versions) {
            Write-Status "Node détecté : $($versions.Node)"
            Write-Status "npm détecté : $($versions.Npm)"
        }
    } catch {
        # ignore
    }
}

if (-not (Has-Command node)) {
    Write-Status "Node.js n'est pas disponible sur ce système."
    if (-not (Has-Command winget)) {
        Write-Host "winget n'est pas installé ou n'est pas disponible dans le PATH."
        Write-Host "Installez d'abord winget ou Node.js depuis https://nodejs.org/ puis relancez ce script."
        exit 1
    }

    if (-not (Install-Node)) {
        Write-Host "Échec de l'installation de Node.js via winget."
        exit 1
    }

    Write-Status "Node.js installé. Fermez puis rouvrez PowerShell si nécessaire, puis relancez ce script."
    # Tentative de relance des commandes dans la même session
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        Write-Host "Node a été installé mais il n'est pas encore dans le PATH de cette session."
        Write-Host "Fermez et rouvrez PowerShell, puis exécutez:`n  .\setup-node.ps1`
"        exit 0
    }
}

$versions = Get-NodeVersion
if (-not $versions) {
    Write-Host "Node.js est installé mais la version n'a pas pu être lue."
    exit 1
}

Write-Status "Version Node : $($versions.Node), npm : $($versions.Npm)"
Write-Status "Exécution de npm install dans le dossier courant..."

try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install a échoué. Vérifiez les erreurs affichées ci-dessus."
        exit $LASTEXITCODE
    }
    Write-Status "npm install terminé avec succès."
} catch {
    Write-Host "Erreur lors de l'exécution de npm install : $_"
    exit 1
}
