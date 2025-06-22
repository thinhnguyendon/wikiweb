const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const JSON5 = require('json5');

const app = express();

const PAGES_DIR = path.join(__dirname, 'pages');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const slug = req.body.title.toLowerCase().replace(/\s+/g, '-');
    const ext = path.extname(file.originalname);
    cb(null, `${slug}-loadout${ext}`);
  }
});
const upload = multer({ storage });

// Helper function to safely parse JSON5 files
function parseJSON5File(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON5.parse(content);
  } catch (error) {
    console.error(`Error parsing JSON5 file ${filepath}:`, error.message);
    throw error;
  }
}

// Helper function to safely write JSON5 files
function writeJSON5File(filepath, data) {
  try {
    const content = JSON5.stringify(data, null, 2);
    fs.writeFileSync(filepath, content);
  } catch (error) {
    console.error(`Error writing JSON5 file ${filepath}:`, error.message);
    throw error;
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/form.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

app.get('/aircraft-form.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'aircraft-form.html'));
});

app.post('/pages', (req, res) => {
  try {
    const { title, about, techtree } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const filepath = path.join(PAGES_DIR, `${slug}.json5`);
    const content = { title, about, techtree, type: 'nation' };
    
    writeJSON5File(filepath, content);
    res.redirect(`/pages/${slug}`);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).send('Error creating page');
  }
});

app.post('/aircraft', upload.single('loadout_img'), (req, res) => {
  try {
    const { title, about, playstyle, proscons, trivia } = req.body;
    const slug = title.toLowerCase().replace(/\s+/g, '-');
    const filepath = path.join(PAGES_DIR, `${slug}.json5`);
    const loadout_img = req.file ? `/uploads/${req.file.filename}` : '';
    const content = { title, about, playstyle, proscons, loadout_img, trivia, type: 'aircraft' };
    
    writeJSON5File(filepath, content);
    res.redirect(`/pages/${slug}`);
  } catch (error) {
    console.error('Error creating aircraft:', error);
    res.status(500).send('Error creating aircraft');
  }
});

app.get('/pages/:slug', (req, res) => {
  try {
    const filepath = path.join(PAGES_DIR, `${req.params.slug}.json5`);
    if (!fs.existsSync(filepath)) {
      return res.status(404).send('<h1>Page not found</h1><a href="/">Back</a>');
    }
    
    const data = parseJSON5File(filepath);

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/mobileview.css">
  <link href="https://fonts.googleapis.com/css2?family=Poppins&family=Roboto&display=swap" rel="stylesheet">
</head>
<body>
  <div class="main-background">
    <img src="/assets-img/background3.png" alt="background" class="backgroundpic">
  </div>
  <header id="main-header">
    <section id="Mainpage">
      <div class="top-header">
        <img src="/assets-img/gamelogo.png" alt="gamelogo" class="logoimg">
        <h1 class="wingsofglory">${data.title}</h1>
      </div>
      <div class="navbar">
        <ul class="navlinks">
          <li class="nationdrop">
            <a href="#">Nations</a>
            <ul class="dropdown-nations">
              <li><a href="/pages/usa">USA</a></li>
              <li><a href="#">UK</a></li>
              <li><a href="#">France</a></li>
              <li><a href="#">Russia/USSR</a></li>
              <li><a href="#">Germany</a></li>
              <li><a href="#">Japan</a></li>
              <li><a href="#">Special</a></li>
              <li><a href="#">Events</a></li>
            </ul>
          </li>
          <li><a href="#">Aircrafts</a></li>
        </ul>
      </div>
    </section>
  </header>
  <div class="content ${data.type === 'nation' ? 'usa-page' : 'aircraft-page'}">
    <span class="star-accent">★</span>
    <h3 class="pageheader">About</h3>
    <p>${(data.about || '').replace(/\n/g, '<br>')}</p>

    ${data.type === 'nation' ? `
      <h3 class="pageheader">Tech Tree</h3>
      <div class="techtree-section">${data.techtree || ''}</div>
    ` : `
      <h3 class="playstyle">Playstyle</h3>
      <p>${(data.playstyle || '').replace(/\n/g, '<br>')}</p>

      <h3 class="proscons">Pros and Cons</h3>
      <p>${(data.proscons || '').replace(/\n/g, '<br>')}</p>

      <h3 class="loadout-img">Loadout Option</h3>
      ${data.loadout_img ? `<img src="${data.loadout_img}" alt="Loadout Image" class="loadout-img">` : '<p>No image uploaded</p>'}

      <h3 class="trivia">Trivia</h3>
      <p>${(data.trivia || '').replace(/\n/g, '<br>')}</p>
    `}

    <br><a class="backtohome" href="/">← Back to Home</a>
  </div>
</body>
</html>`);
  } catch (error) {
    console.error('Error loading page:', error);
    res.status(500).send('<h1>Error loading page</h1><a href="/">Back</a>');
  }
});

app.get('/delete/:slug', (req, res) => {
  try {
    const filepath = path.join(PAGES_DIR, `${req.params.slug}.json5`);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Page not found' });
    }
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ success: false, message: 'Error deleting page' });
  }
});

app.get('/edit.html', (req, res) => {
  try {
    const slug = req.query.slug;
    if (!slug) return res.redirect('/');
    
    const filepath = path.join(PAGES_DIR, `${slug}.json5`);
    if (!fs.existsSync(filepath)) {
      return res.status(404).send('<h1>Page not found</h1><a href="/">Back</a>');
    }
    
    const data = parseJSON5File(filepath);

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Edit ${data.title}</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/mobileview.css">
  <link href="https://fonts.googleapis.com/css2?family=Poppins&family=Roboto&display=swap" rel="stylesheet">
</head>
<body>
  <div class="main-background">
    <img src="/assets-img/background3.png" alt="background" class="backgroundpic">
  </div>
  <header id="main-header">
    <section id="Mainpage">
      <div class="top-header">
        <img src="/assets-img/gamelogo.png" alt="gamelogo" class="logoimg">
        <h1 class="wingsofglory">Edit ${data.title}</h1>
      </div>
    </section>
  </header>
  <div class="content">
    <form method="post" action="/edit/${slug}" enctype="multipart/form-data">
      <h3 class="form">Title</h3>
      <input type="text" name="title" value="${data.title}" required><br><br>

      <h3 class="form">About</h3>
      <textarea name="about" rows="6" required>${data.about || ''}</textarea><br><br>

      ${data.type === 'nation' ? `
        <h3 class="form">Tech Tree</h3>
        <textarea name="techtree" rows="6">${data.techtree || ''}</textarea><br><br>
      ` : `
        <h3 class="form">Playstyle</h3>
        <textarea name="playstyle" rows="6" required>${data.playstyle || ''}</textarea><br><br>

        <h3 class="form">Pros and Cons</h3>
        <textarea name="proscons" rows="6" required>${data.proscons || ''}</textarea><br><br>

        <h3 class="form">Loadout Image</h3>
        <label for="loadout-img">Upload New Image (leave blank to keep existing):</label>
        <input type="file" id="loadout-img" name="loadout_img" accept="image/*"><br>
        ${data.loadout_img ? `<p>Current Image: <img src="${data.loadout_img}" alt="Loadout Image" style="max-width: 100px;"></p>` : '<p>No image uploaded</p>'}<br>

        <h3 class="form">Trivia</h3>
        <textarea name="trivia" rows="6" required>${data.trivia || ''}</textarea><br><br>
      `}

      <button type="submit">Update Page</button>
    </form>
    <br><a href="/">← Back to Home</a>
  </div>
</body>
</html>`);
  } catch (error) {
    console.error('Error loading edit page:', error);
    res.status(500).send('<h1>Error loading edit page</h1><a href="/">Back</a>');
  }
});

app.post('/edit/:slug', upload.single('loadout_img'), (req, res) => {
  try {
    const { title, about, techtree, playstyle, proscons, trivia } = req.body;
    const filepath = path.join(PAGES_DIR, `${req.params.slug}.json5`);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).send('Page not found');
    }

    const data = parseJSON5File(filepath);
    const loadout_img = req.file ? `/uploads/${req.file.filename}` : data.loadout_img || '';
    
    const content = data.type === 'nation'
      ? { title, about, techtree, type: 'nation' }
      : { title, about, playstyle, proscons, loadout_img, trivia, type: 'aircraft' };

    writeJSON5File(filepath, content);
    res.redirect(`/pages/${req.params.slug}`);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).send('Error updating page');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));