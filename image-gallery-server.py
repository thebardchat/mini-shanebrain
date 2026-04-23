#!/usr/bin/env python3
"""
ShaneBrain Media Blitz Gallery
Serves images with download buttons + upload support
Access: http://100.67.120.6:9999
"""

import os
import json
import re
import shutil
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import unquote, quote

IMAGES_DIR = os.path.expanduser("~/mini-shanebrain/images")
SOCIAL_POSTS_DIR = os.path.expanduser("~/Desktop/social-posts")
UPLOAD_DIR = IMAGES_DIR  # uploads go straight to the bot's image folder
PORT = 9999
HOST = "0.0.0.0"

BOOK_URL = "https://www.amazon.com/Probably-Think-This-Book-About/dp/B0GT25R5FD"

# Gemini prompts users can copy-paste to generate more images
GEMINI_PROMPTS = [
    {
        "name": "Noir Detective Desk",
        "prompt": "Dark moody noir detective desk with scattered manuscript pages, whiskey glass, warm amber lamplight casting dramatic shadows, film noir 1940s atmosphere, cinematic lighting. Professional photography style, 16:9 aspect ratio."
    },
    {
        "name": "Book on Dark Table",
        "prompt": "Elegant hardcover book displayed on dark wooden table, dramatic spotlight from above, scattered handwritten pages, fountain pen and ink bottle, atmospheric smoke wisps, professional book photography, moody background."
    },
    {
        "name": "Alabama Porch Writer",
        "prompt": "Southern small town at golden hour, old pickup truck near a porch, person writing at a rustic wooden table, warm sunset light through trees, rural Alabama aesthetic, authentic and peaceful. 16:9 landscape."
    },
    {
        "name": "Pi Meets Pages",
        "prompt": "Raspberry Pi computer with blue LED glow next to an open leather notebook with handwritten story notes, cozy night workspace, desk lamp warmth, where technology meets creative writing. 16:9."
    },
    {
        "name": "Ego Mirror (Abstract)",
        "prompt": "Surreal abstract art: multiple faces looking into mirrors that reflect completely different people, identity and ego concept, dark moody palette with gold and crimson accents, dreamlike, psychological art. 16:9."
    },
    {
        "name": "Midnight Writing Session",
        "prompt": "Person writing by lamplight at 2 AM, coffee mug steam rising, scattered notes and crumpled pages, laptop glow in background, creative insomnia aesthetic, warm moody atmosphere. 16:9 cinematic."
    },
    {
        "name": "Noir City Rain",
        "prompt": "Film noir city street at night, rain-slicked pavement reflecting neon signs, mysterious figure in silhouette, vintage 1940s crime novel cover aesthetic, dramatic shadows and highlights. 16:9."
    },
    {
        "name": "Neural Network Book",
        "prompt": "Glowing neural network brain connected to an open book by streams of golden light particles, dark cosmic background, AI meets literature, futuristic technology meets classic storytelling. 16:9."
    },
    {
        "name": "Dispatch to Author (Split)",
        "prompt": "Split composition: left side shows a busy dispatch office with radio equipment and route maps, right side shows a cozy writing desk with manuscript and coffee. Two worlds, one person. Warm lighting both sides. 16:9."
    },
    {
        "name": "Character Vignettes",
        "prompt": "Artistic collage of 6 small noir scenes: poker table, courtroom, bar counter, church pew, therapist couch, empty stage. Each scene has a solitary character who thinks they are the center of everything. Dark cinematic palette. 16:9."
    },
    {
        "name": "Concrete & Creativity",
        "prompt": "Dump truck at a concrete plant during early morning, golden sunrise, but the concrete dust in the air forms shapes of words and book pages floating upward, magical realism, blue collar meets art. 16:9."
    },
    {
        "name": "Five Boys Legacy",
        "prompt": "Silhouette of a father and five sons standing together on a hilltop at sunset, warm golden light, one of the boys holds a book, another holds a small circuit board, family legacy theme, emotional and powerful. 16:9."
    },
]


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ShaneBrain Media Blitz</title>
<style>
  :root {{
    --bg: #1a1a2e;
    --card: #16213e;
    --accent: #0f3460;
    --blue: #007bff;
    --gold: #e2b714;
    --text: #eee;
    --dim: #888;
  }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }}
  .header {{
    background: linear-gradient(135deg, var(--accent), var(--card));
    padding: 24px;
    text-align: center;
    border-bottom: 2px solid var(--gold);
  }}
  .header h1 {{ font-size: 1.8em; color: var(--gold); font-weight: 300; }}
  .header p {{ color: var(--dim); margin-top: 6px; font-size: 0.9em; }}
  .stats {{
    display: flex; gap: 20px; justify-content: center;
    margin-top: 12px; flex-wrap: wrap;
  }}
  .stat {{
    background: rgba(255,255,255,0.05);
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.85em;
  }}
  .stat b {{ color: var(--gold); }}

  .tabs {{
    display: flex; gap: 0; justify-content: center;
    background: var(--card); border-bottom: 1px solid rgba(255,255,255,0.1);
  }}
  .tab {{
    padding: 12px 24px; cursor: pointer; font-size: 0.95em;
    border-bottom: 2px solid transparent; transition: all 0.2s;
  }}
  .tab:hover {{ background: rgba(255,255,255,0.05); }}
  .tab.active {{ border-bottom-color: var(--gold); color: var(--gold); }}

  .panel {{ display: none; padding: 20px; }}
  .panel.active {{ display: block; }}

  /* Gallery */
  .gallery {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    padding: 4px;
  }}
  .img-card {{
    background: var(--card);
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s;
  }}
  .img-card:hover {{ transform: translateY(-3px); border-color: var(--blue); }}
  .img-card img {{
    width: 100%;
    height: 200px;
    object-fit: cover;
    cursor: pointer;
  }}
  .img-card .info {{
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .img-card .name {{
    font-size: 0.8em;
    color: var(--dim);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }}
  .dl-btn {{
    background: var(--blue);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85em;
    text-decoration: none;
    display: inline-block;
  }}
  .dl-btn:hover {{ background: #0056b3; }}
  .dl-btn.gold {{ background: var(--gold); color: #000; }}
  .dl-btn.gold:hover {{ background: #c9a012; }}
  .dl-btn.red {{ background: #dc3545; }}
  .dl-btn.red:hover {{ background: #b02a37; }}

  /* Upload */
  .upload-zone {{
    border: 2px dashed rgba(255,255,255,0.2);
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    margin: 20px auto;
    max-width: 500px;
    cursor: pointer;
    transition: border-color 0.2s;
  }}
  .upload-zone:hover, .upload-zone.dragover {{
    border-color: var(--gold);
  }}
  .upload-zone input {{ display: none; }}

  /* Prompts */
  .prompt-list {{ max-width: 800px; margin: 0 auto; }}
  .prompt-card {{
    background: var(--card);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid rgba(255,255,255,0.08);
  }}
  .prompt-card h3 {{ color: var(--gold); margin-bottom: 8px; font-size: 1em; }}
  .prompt-card p {{ color: var(--dim); font-size: 0.85em; line-height: 1.5; }}
  .prompt-card .actions {{ margin-top: 10px; display: flex; gap: 8px; }}

  /* Lightbox */
  .lightbox {{
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.92); z-index: 1000;
    justify-content: center; align-items: center; flex-direction: column;
  }}
  .lightbox.show {{ display: flex; }}
  .lightbox img {{ max-width: 95vw; max-height: 85vh; border-radius: 8px; }}
  .lightbox .close {{
    position: absolute; top: 16px; right: 24px;
    font-size: 2em; color: white; cursor: pointer;
  }}
  .lightbox .lb-actions {{ margin-top: 12px; display: flex; gap: 10px; }}

  .book-link {{
    display: block; text-align: center; padding: 12px;
    background: var(--card); border-top: 1px solid rgba(255,255,255,0.08);
    color: var(--gold); text-decoration: none; font-size: 0.9em;
  }}
  .book-link:hover {{ background: var(--accent); }}

  @media (max-width: 600px) {{
    .gallery {{ grid-template-columns: 1fr 1fr; gap: 8px; }}
    .img-card img {{ height: 140px; }}
    .img-card .info {{ flex-direction: column; gap: 6px; }}
    .header h1 {{ font-size: 1.3em; }}
  }}
</style>
</head>
<body>

<div class="header">
  <h1>ShaneBrain Media Blitz</h1>
  <p>Book promo images for social bots | Download, upload, or generate more</p>
  <div class="stats">
    <div class="stat"><b>{image_count}</b> images ready</div>
    <div class="stat"><b>{video_count}</b> videos</div>
    <div class="stat"><b>2</b> bots posting</div>
  </div>
</div>

<div class="tabs">
  <div class="tab active" onclick="showTab('gallery')">Gallery</div>
  <div class="tab" onclick="showTab('upload')">Upload</div>
  <div class="tab" onclick="showTab('prompts')">Gemini Prompts</div>
  <a class="tab" href="/social-posts/" style="text-decoration:none;color:inherit">Social Posts</a>
</div>

<!-- GALLERY -->
<div class="panel active" id="panel-gallery">
  <div class="gallery">
    {image_cards}
  </div>
</div>

<!-- UPLOAD -->
<div class="panel" id="panel-upload">
  <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
    <p style="font-size:2em;margin-bottom:8px">+</p>
    <p>Tap to select images or drag & drop</p>
    <p style="color:var(--dim);font-size:0.8em;margin-top:6px">PNG, JPG — goes straight to bot image folder</p>
    <input type="file" id="fileInput" accept="image/*" multiple onchange="uploadFiles(this.files)">
  </div>
  <div id="uploadStatus" style="text-align:center;margin-top:12px;color:var(--dim)"></div>
</div>

<!-- PROMPTS -->
<div class="panel" id="panel-prompts">
  <p style="text-align:center;color:var(--dim);margin-bottom:16px">
    Copy these prompts into <b>Gemini Pro</b> (gemini.google.com) to generate images, then upload them above.
  </p>
  <div class="prompt-list">
    {prompt_cards}
  </div>
</div>

<a class="book-link" href="{book_url}" target="_blank">
  "You Probably Think This Book Is About You" — Available on Amazon
</a>

<!-- LIGHTBOX -->
<div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
  <span class="close" onclick="closeLightbox()">&times;</span>
  <img id="lbImage" src="" alt="">
  <div class="lb-actions">
    <a id="lbDownload" class="dl-btn gold" href="" download>Download</a>
  </div>
</div>

<script>
function showTab(name) {{
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-' + name).classList.add('active');
}}

function openLightbox(src, filename) {{
  document.getElementById('lbImage').src = src;
  document.getElementById('lbDownload').href = '/download/' + encodeURIComponent(filename);
  document.getElementById('lightbox').classList.add('show');
}}

function closeLightbox(e) {{
  if (!e || e.target === document.getElementById('lightbox') || e.target.classList.contains('close')) {{
    document.getElementById('lightbox').classList.remove('show');
  }}
}}

function copyPrompt(btn, text) {{
  navigator.clipboard.writeText(text).then(() => {{
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy Prompt', 1500);
  }});
}}

// Upload
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => {{ e.preventDefault(); dropZone.classList.add('dragover'); }});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {{
  e.preventDefault();
  dropZone.classList.remove('dragover');
  uploadFiles(e.dataTransfer.files);
}});

async function uploadFiles(files) {{
  const status = document.getElementById('uploadStatus');
  let ok = 0, fail = 0;
  for (const file of files) {{
    if (!file.type.startsWith('image/')) {{ fail++; continue; }}
    const form = new FormData();
    form.append('file', file);
    status.textContent = 'Uploading ' + file.name + '...';
    try {{
      const resp = await fetch('/upload', {{ method: 'POST', body: form }});
      if (resp.ok) {{ ok++; }} else {{ fail++; }}
    }} catch {{ fail++; }}
  }}
  status.innerHTML = '<span style="color:#2ecc71">' + ok + ' uploaded</span>' +
    (fail ? ', <span style="color:#e74c3c">' + fail + ' failed</span>' : '') +
    ' — <a href="/" style="color:var(--gold)">refresh to see</a>';
}}

function deleteImage(filename) {{
  if (!confirm('Delete ' + filename + '?')) return;
  fetch('/delete/' + encodeURIComponent(filename), {{ method: 'DELETE' }})
    .then(r => {{ if (r.ok) location.reload(); else alert('Delete failed'); }});
}}

document.addEventListener('keydown', (e) => {{
  if (e.key === 'Escape') closeLightbox();
}});
</script>
</body>
</html>"""


SOCIAL_POSTS_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Social Posts — ShaneBrain Media Blitz</title>
<style>
  :root {{
    --bg: #1a1a2e;
    --card: #16213e;
    --accent: #0f3460;
    --blue: #007bff;
    --gold: #e2b714;
    --green: #2ecc71;
    --text: #eee;
    --dim: #888;
  }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }}
  .header {{
    background: linear-gradient(135deg, var(--accent), var(--card));
    padding: 24px;
    text-align: center;
    border-bottom: 2px solid var(--gold);
  }}
  .header h1 {{ font-size: 1.8em; color: var(--gold); font-weight: 300; }}
  .header p {{ color: var(--dim); margin-top: 6px; font-size: 0.9em; }}
  .nav {{
    display: flex; gap: 0; justify-content: center;
    background: var(--card); border-bottom: 1px solid rgba(255,255,255,0.1);
  }}
  .nav a {{
    padding: 12px 24px; text-decoration: none; color: var(--text); font-size: 0.95em;
    border-bottom: 2px solid transparent; transition: all 0.2s;
  }}
  .nav a:hover {{ background: rgba(255,255,255,0.05); }}
  .nav a.active {{ border-bottom-color: var(--gold); color: var(--gold); }}

  .content {{ padding: 20px; max-width: 1200px; margin: 0 auto; }}

  .section-title {{
    color: var(--gold); font-size: 1.2em; margin: 24px 0 12px 0;
    padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);
  }}
  .section-title:first-child {{ margin-top: 0; }}

  /* Image grid */
  .img-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }}
  .img-card {{
    background: var(--card);
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s;
  }}
  .img-card:hover {{ transform: translateY(-3px); border-color: var(--blue); }}
  .img-card img {{
    width: 100%;
    height: 180px;
    object-fit: cover;
  }}
  .img-card .info {{
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .img-card .name {{
    font-size: 0.8em; color: var(--dim);
    max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }}

  /* Post cards */
  .post-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }}
  .post-card {{
    background: var(--card);
    border-radius: 10px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s;
  }}
  .post-card:hover {{ transform: translateY(-2px); border-color: var(--green); }}
  .post-card h3 {{
    color: var(--green); font-size: 1em; margin-bottom: 8px;
  }}
  .post-card .platform {{
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    font-size: 0.75em; margin-bottom: 8px; font-weight: bold;
  }}
  .platform.reddit {{ background: #ff4500; color: white; }}
  .platform.twitter {{ background: #1da1f2; color: white; }}
  .platform.hackernews {{ background: #ff6600; color: white; }}
  .post-card .preview {{
    color: var(--dim); font-size: 0.82em; line-height: 1.5;
    max-height: 80px; overflow: hidden;
    margin-bottom: 12px;
  }}
  .post-card .actions {{ display: flex; gap: 8px; flex-wrap: wrap; }}

  .dl-btn {{
    background: var(--blue); color: white; border: none;
    padding: 8px 16px; border-radius: 6px; cursor: pointer;
    font-size: 0.85em; text-decoration: none; display: inline-block;
  }}
  .dl-btn:hover {{ background: #0056b3; }}
  .dl-btn.gold {{ background: var(--gold); color: #000; }}
  .dl-btn.gold:hover {{ background: #c9a012; }}
  .dl-btn.green {{ background: var(--green); color: #000; }}
  .dl-btn.green:hover {{ background: #27ae60; }}

  .book-link {{
    display: block; text-align: center; padding: 12px;
    background: var(--card); border-top: 1px solid rgba(255,255,255,0.08);
    color: var(--gold); text-decoration: none; font-size: 0.9em;
  }}
  .book-link:hover {{ background: var(--accent); }}

  .download-all {{
    text-align: center; margin: 20px 0;
  }}

  @media (max-width: 600px) {{
    .img-grid {{ grid-template-columns: 1fr 1fr; gap: 8px; }}
    .post-grid {{ grid-template-columns: 1fr; }}
    .img-card img {{ height: 120px; }}
  }}
</style>
</head>
<body>

<div class="header">
  <h1>Social Posts — Media Blitz Kit</h1>
  <p>Ready-to-post content for Reddit, Twitter/X, Hacker News | Images + copy</p>
</div>

<div class="nav">
  <a href="/">Bot Images</a>
  <a href="/social-posts/" class="active">Social Posts</a>
</div>

<div class="content">

  <div class="download-all">
    <a class="dl-btn gold" href="/social-posts/download-all" style="padding:12px 32px;font-size:1em">
      Download All ({total_files} files)
    </a>
  </div>

  <h2 class="section-title">Screenshots & Images ({sp_image_count})</h2>
  <div class="img-grid">
    {sp_image_cards}
  </div>

  <h2 class="section-title">Post Templates ({sp_post_count})</h2>
  <div class="post-grid">
    {sp_post_cards}
  </div>

</div>

<a class="book-link" href="{book_url}" target="_blank">
  "You Probably Think This Book Is About You" — Available on Amazon
</a>

</body>
</html>"""


class GalleryHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.send_gallery()
        elif self.path == "/social-posts/" or self.path == "/social-posts":
            self.send_social_posts()
        elif self.path.startswith("/social-posts/download-all"):
            self.serve_social_posts_zip()
        elif self.path.startswith("/social-posts/image/"):
            self.serve_social_post_file(self.path[20:], inline=True)
        elif self.path.startswith("/social-posts/download/"):
            self.serve_social_post_file(self.path[23:], inline=False)
        elif self.path.startswith("/social-posts/view/"):
            self.serve_social_post_text(self.path[19:])
        elif self.path.startswith("/image/"):
            self.serve_image()
        elif self.path.startswith("/download/"):
            self.serve_download()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/upload":
            self.handle_upload()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/delete/"):
            filename = unquote(self.path[8:])
            filepath = os.path.join(IMAGES_DIR, filename)
            if os.path.isfile(filepath) and not ".." in filename:
                os.remove(filepath)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"OK")
            else:
                self.send_error(404)
        else:
            self.send_error(404)

    def send_gallery(self):
        files = sorted(os.listdir(IMAGES_DIR))
        images = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        videos = [f for f in files if f.lower().endswith(('.mp4', '.webm'))]

        cards = []
        for img in images:
            encoded = quote(img)
            cards.append(f"""
            <div class="img-card">
              <img src="/image/{encoded}" alt="{img}"
                   onclick="openLightbox('/image/{encoded}', '{img}')"
                   loading="lazy">
              <div class="info">
                <span class="name" title="{img}">{img}</span>
                <div style="display:flex;gap:4px">
                  <a class="dl-btn" href="/download/{encoded}" download>Save</a>
                  <button class="dl-btn red" onclick="deleteImage('{img}')" title="Delete">X</button>
                </div>
              </div>
            </div>""")

        prompt_cards = []
        for p in GEMINI_PROMPTS:
            escaped = p["prompt"].replace("'", "\\'").replace('"', "&quot;")
            prompt_cards.append(f"""
            <div class="prompt-card">
              <h3>{p["name"]}</h3>
              <p>{p["prompt"]}</p>
              <div class="actions">
                <button class="dl-btn gold" onclick="copyPrompt(this, '{escaped}')">Copy Prompt</button>
              </div>
            </div>""")

        html = HTML_TEMPLATE.format(
            image_count=len(images),
            video_count=len(videos),
            image_cards="\n".join(cards),
            prompt_cards="\n".join(prompt_cards),
            book_url=BOOK_URL,
        )

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

    def serve_image(self):
        filename = unquote(self.path[7:])
        filepath = os.path.join(IMAGES_DIR, filename)
        if not os.path.isfile(filepath) or ".." in filename:
            self.send_error(404)
            return
        ext = filename.lower().rsplit(".", 1)[-1]
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}.get(ext, "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        with open(filepath, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def serve_download(self):
        filename = unquote(self.path[10:])
        filepath = os.path.join(IMAGES_DIR, filename)
        if not os.path.isfile(filepath) or ".." in filename:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        with open(filepath, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def handle_upload(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self.send_error(400, "Expected multipart/form-data")
            return

        # Extract boundary from content-type
        match = re.search(r'boundary=(.+)', content_type)
        if not match:
            self.send_error(400, "No boundary")
            return
        boundary = match.group(1).strip().encode()

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        # Parse multipart: find file data between boundaries
        parts = body.split(b"--" + boundary)
        filename = None
        file_data = None

        for part in parts:
            if b"filename=" not in part:
                continue
            # Extract filename
            header_end = part.find(b"\r\n\r\n")
            if header_end == -1:
                continue
            headers_raw = part[:header_end].decode("utf-8", errors="replace")
            fn_match = re.search(r'filename="([^"]+)"', headers_raw)
            if not fn_match:
                continue
            filename = fn_match.group(1)
            # File data is after the double CRLF, strip trailing CRLF
            file_data = part[header_end + 4:]
            if file_data.endswith(b"\r\n"):
                file_data = file_data[:-2]
            break

        if not filename or not file_data:
            self.send_error(400, "No file found in upload")
            return

        # Sanitize filename
        safe_name = os.path.basename(filename).replace(" ", "-")
        if not safe_name.lower().endswith(('.png', '.jpg', '.jpeg')):
            safe_name += '.png'

        dest = os.path.join(UPLOAD_DIR, safe_name)
        with open(dest, "wb") as f:
            f.write(file_data)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True, "filename": safe_name}).encode())

    def send_social_posts(self):
        files = sorted(os.listdir(SOCIAL_POSTS_DIR))
        images = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        posts = [f for f in files if f.lower().endswith('.md')]

        # Image cards
        img_cards = []
        for img in images:
            encoded = quote(img)
            img_cards.append(f"""
            <div class="img-card">
              <img src="/social-posts/image/{encoded}" alt="{img}" loading="lazy">
              <div class="info">
                <span class="name" title="{img}">{img}</span>
                <a class="dl-btn" href="/social-posts/download/{encoded}" download>Save</a>
              </div>
            </div>""")

        # Post cards
        post_cards = []
        for md in posts:
            encoded = quote(md)
            name = md.replace("POST-", "").replace(".md", "").replace("-", " ")

            # Detect platform
            platform_class = "reddit"
            if "TWITTER" in md.upper():
                platform_class = "twitter"
            elif "HACKERNEWS" in md.upper() or "HN" in md.upper():
                platform_class = "hackernews"

            platform_label = platform_class.upper()

            # Read preview
            try:
                with open(os.path.join(SOCIAL_POSTS_DIR, md), "r") as f:
                    content = f.read()
                # Get first 200 chars of body (skip title line)
                lines = content.strip().split("\n")
                preview = " ".join(l for l in lines[1:5] if l.strip()).strip()[:200]
            except Exception:
                preview = "(could not read)"

            post_cards.append(f"""
            <div class="post-card">
              <span class="platform {platform_class}">{platform_label}</span>
              <h3>{name}</h3>
              <div class="preview">{preview}</div>
              <div class="actions">
                <a class="dl-btn green" href="/social-posts/view/{encoded}" target="_blank">View</a>
                <a class="dl-btn" href="/social-posts/download/{encoded}" download>Download</a>
              </div>
            </div>""")

        html = SOCIAL_POSTS_TEMPLATE.format(
            total_files=len(images) + len(posts),
            sp_image_count=len(images),
            sp_image_cards="\n".join(img_cards),
            sp_post_count=len(posts),
            sp_post_cards="\n".join(post_cards),
            book_url=BOOK_URL,
        )

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

    def serve_social_post_file(self, raw_name, inline=True):
        filename = unquote(raw_name)
        filepath = os.path.join(SOCIAL_POSTS_DIR, filename)
        if not os.path.isfile(filepath) or ".." in filename:
            self.send_error(404)
            return
        ext = filename.lower().rsplit(".", 1)[-1]
        if inline:
            mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                    "md": "text/plain"}.get(ext, "application/octet-stream")
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
        else:
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.end_headers()
        with open(filepath, "rb") as f:
            shutil.copyfileobj(f, self.wfile)

    def serve_social_post_text(self, raw_name):
        """Render a markdown file as a simple styled HTML page."""
        filename = unquote(raw_name)
        filepath = os.path.join(SOCIAL_POSTS_DIR, filename)
        if not os.path.isfile(filepath) or ".." in filename:
            self.send_error(404)
            return
        try:
            with open(filepath, "r") as f:
                content = f.read()
        except Exception:
            self.send_error(500)
            return

        # Simple markdown-ish rendering
        import html as html_mod
        escaped = html_mod.escape(content)
        # Bold
        escaped = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', escaped)
        # Headers
        escaped = re.sub(r'^### (.+)$', r'<h3>\1</h3>', escaped, flags=re.MULTILINE)
        escaped = re.sub(r'^## (.+)$', r'<h2>\1</h2>', escaped, flags=re.MULTILINE)
        # Links
        escaped = re.sub(r'(https?://\S+)', r'<a href="\1" target="_blank" style="color:#007bff">\1</a>', escaped)
        # Line breaks
        escaped = escaped.replace("\n", "<br>\n")
        # HR
        escaped = escaped.replace("---<br>", "<hr>")

        page = f"""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{filename}</title>
<style>
body {{ font-family: -apple-system, sans-serif; background: #1a1a2e; color: #eee;
       max-width: 700px; margin: 0 auto; padding: 24px; line-height: 1.7; }}
h2 {{ color: #e2b714; margin-top: 24px; }}
h3 {{ color: #2ecc71; margin-top: 16px; }}
hr {{ border: none; border-top: 1px solid rgba(255,255,255,0.15); margin: 20px 0; }}
a {{ color: #007bff; }}
.back {{ display: inline-block; margin-bottom: 16px; color: #888; text-decoration: none; }}
.back:hover {{ color: #eee; }}
.copy-btn {{ background: #e2b714; color: #000; border: none; padding: 8px 20px;
             border-radius: 6px; cursor: pointer; font-size: 0.9em; margin: 12px 0; }}
.copy-btn:hover {{ background: #c9a012; }}
</style></head><body>
<a class="back" href="/social-posts/">&larr; Back to Social Posts</a>
<button class="copy-btn" onclick="copyAll()">Copy All Text</button>
<hr>
{escaped}
<script>
function copyAll() {{
  const text = {json.dumps(content)};
  navigator.clipboard.writeText(text).then(() => {{
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy All Text', 1500);
  }});
}}
</script>
</body></html>"""

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(page.encode())

    def serve_social_posts_zip(self):
        """Create and serve a zip of all social-posts files."""
        import zipfile
        import io
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in os.listdir(SOCIAL_POSTS_DIR):
                fp = os.path.join(SOCIAL_POSTS_DIR, f)
                if os.path.isfile(fp):
                    zf.write(fp, f)
        data = buf.getvalue()
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", 'attachment; filename="social-posts-blitz.zip"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        # Quiet logging
        pass


if __name__ == "__main__":
    print(f"ShaneBrain Media Blitz Gallery")
    print(f"Images: {IMAGES_DIR}")
    print(f"Serving at http://0.0.0.0:{PORT}")
    print(f"Remote: http://100.67.120.6:{PORT}")
    print()
    server = HTTPServer((HOST, PORT), GalleryHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutdown.")
