const form = document.getElementById('counterForm');
const embedBox = document.getElementById('embedCode');
const previewImg = document.getElementById('previewImage');
const previewBox = document.querySelector('.preview-box');

// Theme selection color fill + outline effect
document.querySelectorAll('.theme-option').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.theme-option').forEach(opt => (opt.style.outline = '2px solid white'));
        el.style.outline = '2px solid #d63384';

        document.getElementById('theme').value = el.getAttribute('data-bg');
        document.getElementById('fontColor').value = el.getAttribute('data-font');
        document.getElementById('borderColor').value = el.getAttribute('data-border');

        updatePreview();
    });
});

function getFormParams() {
    const label = document.getElementById('label').value.trim() || 'Visits';
    const layout = document.getElementById('layout').value;
    const font = document.getElementById('font').value;
    const bg = document.getElementById('theme').value;
    const fontColor = document.getElementById('fontColor').value;
    const border = document.getElementById('border').value;
    const borderColor = document.getElementById('borderColor').value;
    const borderWidth = document.getElementById('borderWidth').value;
    // Note: preview ignores startAt and bgImage for live preview
    return new URLSearchParams({
        label, font, bg, fontColor, border, borderColor, borderWidth, layout
    }).toString();
}

function updatePreview() {
    const params = getFormParams();
    const bgFile = document.getElementById('bgImage').files[0];

    if (bgFile) {
        const reader = new FileReader();
        reader.onload = () => {
            const bgImg = new Image();
            const overlayImg = new Image();
            let loaded = 0;

            const tryRender = () => {
                loaded++;
                if (loaded < 2) return;

                const canvas = document.createElement('canvas');
                canvas.width = 88;
                canvas.height = 31;
                const ctx = canvas.getContext('2d');

                ctx.drawImage(bgImg, 0, 0, 88, 31); // Draw background
                ctx.drawImage(overlayImg, 0, 0, 88, 31); // Draw overlay

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
        previewImg.src = `/preview.png?${params}&_=${Date.now()}`;
        previewBox.style.display = 'block';
    }
}



// Update preview on any input change
['label', 'layout', 'font', 'theme', 'fontColor', 'border', 'borderColor', 'borderWidth'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const site = document.getElementById('site').value.trim();
    if (!site) {
        alert('Please enter a site name or ID');
        return;
    }

    const label = document.getElementById('label').value.trim() || 'Visits';
    const startAt = parseInt(document.getElementById('startAt').value, 10) || 0;
    const layout = document.getElementById('layout').value;
    const font = document.getElementById('font').value;
    const bg = document.getElementById('theme').value;
    const fontColor = document.getElementById('fontColor').value;
    const border = document.getElementById('border').value;
    const borderColor = document.getElementById('borderColor').value;
    const borderWidth = document.getElementById('borderWidth').value;
    const bgFile = document.getElementById('bgImage').files[0];

    const createPayload = {
        site,
        startAt,
        options: {
            label,
            layout,
            font,
            bg,
            fontColor,
            border,
            borderColor,
            borderWidth,
        },
    };

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

    // Upload background image if any
    if (bgFile) {
        await resizeAndUpload(bgFile, counterId);
    }

    // Build embed code
    const queryParams = new URLSearchParams({
        page: counterId,
        label,
        font,
        bg,
        fontColor,
        border,
        borderColor,
        borderWidth,
        layout,
    }).toString();

    embedBox.value = `<a href="https://kawaiicounter.com" target="_blank" rel="noopener"><img src="https://kawaiicounter.com/counter.png?${queryParams}" width="88" height="31" alt="Kawaii Counter"></a>`;
});

async function resizeAndUpload(file, counterId) {
    const img = new Image();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            img.onload = () => {
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

loadScrollingCounters();

// Initialize preview on load
updatePreview();