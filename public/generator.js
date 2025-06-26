// =======================
// DOM ELEMENT REFERENCES
// =======================

const form = document.getElementById('counterForm');
const embedBox = document.getElementById('embedCode');
const previewImg = document.getElementById('previewImage');
const previewBox = document.querySelector('.preview-box');

// =======================
// THEME SELECTION HANDLER
// =======================

document.querySelectorAll('.theme-option').forEach(el => {
    el.addEventListener('click', () => {
        // Reset outlines on all theme options
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.style.outline = '2px solid white';
        });

        // Highlight selected theme option
        el.style.outline = '2px solid #d63384';

        // Set form values based on selected theme data attributes
        document.getElementById('theme').value = el.getAttribute('data-bg');
        document.getElementById('fontColor').value = el.getAttribute('data-font');
        document.getElementById('borderColor').value = el.getAttribute('data-border');

        updatePreview(); // Update preview after theme change
    });
});

// =======================
// FORM PARAMETER PARSER
// =======================

function getFormParams() {
    const label = document.getElementById('label').value.trim() || 'Visits';
    return new URLSearchParams({
        label,
        font: document.getElementById('font').value,
        bg: document.getElementById('theme').value,
        fontColor: document.getElementById('fontColor').value,
        border: document.getElementById('border').value,
        borderColor: document.getElementById('borderColor').value,
        borderWidth: document.getElementById('borderWidth').value,
        layout: document.getElementById('layout').value
    }).toString();
}

// =======================
// PREVIEW IMAGE GENERATOR
// =======================

function updatePreview() {
    const params = getFormParams();
    const bgFile = document.getElementById('bgImage').files[0];

    if (bgFile) {
        // If background file is uploaded, use it as the preview background
        const reader = new FileReader();
        reader.onload = () => {
            const bgImg = new Image();
            const overlayImg = new Image();
            let loaded = 0;

            const tryRender = () => {
                if (++loaded < 2) return;

                // Draw both background and overlay on canvas
                const canvas = document.createElement('canvas');
                canvas.width = 88;
                canvas.height = 31;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bgImg, 0, 0, 88, 31);
                ctx.drawImage(overlayImg, 0, 0, 88, 31);

                previewImg.src = canvas.toDataURL('image/png');
                previewBox.style.display = 'block';
            };

            bgImg.onload = tryRender;
            overlayImg.onload = tryRender;

            bgImg.src = reader.result;
            overlayImg.src = `/preview.png?${params}&_=${Date.now()}`;
        };
        reader.readAsDataURL(bgFile);
    } else {
        // Default preview without background image
        previewImg.src = `/preview.png?${params}&_=${Date.now()}`;
        previewBox.style.display = 'block';
    }
}

// ===========================
// LIVE INPUT CHANGE HANDLING
// ===========================

[
    'label', 'layout', 'font', 'theme',
    'fontColor', 'border', 'borderColor', 'borderWidth'
].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
});

// =======================
// FORM SUBMISSION HANDLER
// =======================

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const site = document.getElementById('site').value.trim();
    if (!site) {
        alert('Please enter a site name or ID');
        return;
    }

    const createPayload = {
        site,
        startAt: parseInt(document.getElementById('startAt').value, 10) || 0,
        options: {
            label: document.getElementById('label').value.trim() || 'Visits',
            layout: document.getElementById('layout').value,
            font: document.getElementById('font').value,
            bg: document.getElementById('theme').value,
            fontColor: document.getElementById('fontColor').value,
            border: document.getElementById('border').value,
            borderColor: document.getElementById('borderColor').value,
            borderWidth: document.getElementById('borderWidth').value,
        }
    };

    // Send counter creation request
    const res = await fetch('/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
    });

    if (!res.ok) {
        alert('Failed to create counter.');
        return;
    }

    const data = await res.json();
    const counterId = data.id;
    const bgFile = document.getElementById('bgImage').files[0];

    // Optional: Upload background image
    if (bgFile) {
        await resizeAndUpload(bgFile, counterId);
    }

    // Generate and populate embed code
    const queryParams = new URLSearchParams({
        page: counterId,
        ...createPayload.options
    }).toString();

    embedBox.value = `<a href="https://kawaiicounter.com" target="_blank" rel="noopener"><img src="https://kawaiicounter.com/counter.png?${queryParams}" width="88" height="31" alt="Kawaii Counter"></a>`;
});

// ============================
// IMAGE RESIZER & UPLOADER
// ============================

async function resizeAndUpload(file, counterId) {
    const img = new Image();

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = () => {
            img.onload = () => {
                // Resize uploaded image to 88x31
                const canvas = document.createElement('canvas');
                canvas.width = 88;
                canvas.height = 31;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, 88, 31);

                canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('bgImage', blob, 'bg.png');
                    formData.append('counterId', counterId);

                    await fetch('/upload-bg', {
                        method: 'POST',
                        body: formData,
                    });

                    resolve();
                }, 'image/png');
            };
            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

// =======================
// SCROLLING COUNTER LOAD
// =======================

async function loadScrollingCounters() {
    try {
        const res = await fetch('/all-counters');
        const ids = await res.json();
        const track = document.getElementById('counterTrack');

        ids.forEach(id => {
            const img = document.createElement('img');
            img.src = `/static-counter.png?page=${id}`;
            img.width = 88;
            img.height = 31;
            img.style.marginRight = '12px';
            track.appendChild(img);
        });
    } catch (err) {
        console.error('Failed to load counters:', err);
    }
}

// =======================
// INIT ON LOAD
// =======================

loadScrollingCounters();
updatePreview();
