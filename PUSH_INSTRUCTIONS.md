# Git Push Instructions

## Authentication Required

GitHub no longer accepts password authentication. You need to use a **Personal Access Token (PAT)**.

### Step 1: Create Personal Access Token

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "coddle-sleep-coach"
4. Select scopes: **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Push to GitHub

Run these commands in PowerShell from the `coddle_app` directory:

```powershell
cd C:\Users\LENOVO\Desktop\coddle_assesment\coddle_app

# When prompted for username, enter: sanskrutikanthale01
# When prompted for password, paste your Personal Access Token (not your GitHub password)

git push -u origin main
```

### Alternative: Use Git Credential Manager

If you have Git Credential Manager installed, it will prompt you to authenticate through a browser.

### Alternative: Set Remote with Token

```powershell
git remote set-url origin https://YOUR_TOKEN@github.com/sanskrutikanthale01/coddle-sleep-coach.git
git push -u origin main
```

Replace `YOUR_TOKEN` with your actual Personal Access Token.

