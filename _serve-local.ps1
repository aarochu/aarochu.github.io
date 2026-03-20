$ErrorActionPreference = "Stop"
$port = 5173
$root = $PSScriptRoot
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$port/")
try { $listener.Start() } catch {
  Write-Host "Could not bind port $port. Try: netsh http add urlacl url=http://127.0.0.1:$port/ user=$env:USERNAME"
  exit 1
}
Write-Host "Site: http://127.0.0.1:$port/"
Write-Host "Press Ctrl+C to stop."
function Get-Mime([string]$ext) {
  switch ($ext.ToLower()) {
    ".html" { "text/html; charset=utf-8" }
    ".css"  { "text/css; charset=utf-8" }
    ".js"   { "text/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png"  { "image/png" }
    ".jpg"  { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".gif"  { "image/gif" }
    ".svg"  { "image/svg+xml" }
    ".ico"  { "image/x-icon" }
    ".webp" { "image/webp" }
    default { "application/octet-stream" }
  }
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($req.Url.LocalPath.TrimStart("/"))
    if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
    $file = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $rel))
    if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
    } elseif ([System.IO.File]::Exists($file)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $res.ContentType = Get-Mime ([System.IO.Path]::GetExtension($file))
      $res.ContentLength64 = $bytes.LongLength
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } elseif ([System.IO.Directory]::Exists($file)) {
      $idx = [System.IO.Path]::Combine($file, "index.html")
      if ([System.IO.File]::Exists($idx)) {
        $bytes = [System.IO.File]::ReadAllBytes($idx)
        $res.ContentType = "text/html; charset=utf-8"
        $res.ContentLength64 = $bytes.LongLength
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else { $res.StatusCode = 404 }
    } else { $res.StatusCode = 404 }
  } finally { $res.Close() }
}
