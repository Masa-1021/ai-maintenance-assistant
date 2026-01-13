$env:AWS_DEFAULT_REGION = "us-west-2"

Set-Location $PSScriptRoot

# Get temporary credentials from SSO using AWS CLI
Write-Host "Getting temporary credentials from SSO..."
$roleCredentials = aws sts assume-role-with-web-identity --profile BootcampDeveloper-722631436454 2>$null

# Use AWS configure export-credentials to get the actual credentials
$credentialsJson = aws configure export-credentials --profile BootcampDeveloper-722631436454 --format env-no-export 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to export credentials. Trying direct CDK with profile..."
} else {
    # Parse and set credentials
    $credentialsJson -split "`n" | ForEach-Object {
        if ($_ -match "^(\w+)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            Write-Host "Set $($matches[1])"
        }
    }
}

# Also set profile as fallback
$env:AWS_PROFILE = "BootcampDeveloper-722631436454"
$env:AWS_SDK_LOAD_CONFIG = "1"

Write-Host "Bootstrapping CDK..."
npx cdk bootstrap aws://722631436454/us-west-2

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deploying all stacks..."
    npx cdk deploy --all --require-approval never
} else {
    Write-Host "Bootstrap failed with exit code: $LASTEXITCODE"
}
