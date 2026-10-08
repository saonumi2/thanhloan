import { createPortrait } from './character.js';
import './config.js';
const config = window.GIFT_CONFIG;
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let opened = false;
let opening = false;
let portrait = null;
let fallingTimer = null;
let fallingSpawnIndex = 0;
let previousFocus = null;
let musicRequest = 0;
let nextMemoryIndex = 0;
// Only icon clicks unlock memories, always in configuration order.
const unlockedMemories = new Set();
const music = $('music');
const dialog = $('memoryDialog');

function resetMemories() {
  unlockedMemories.clear();
  nextMemoryIndex = 0;
  previousFocus = null;
  $('memoryStrip').replaceChildren();
  $('memoryStrip').hidden = true;
  if (dialog.open) dialog.close();
  $('memoryImage').removeAttribute('src');
  $('memoryImage').alt = '';
  $('memoryTitle').textContent = 'Một lời chúc dành cho cậu';
  $('memoryText').textContent = '';
  document.body.style.overflow = '';
}
resetMemories();

$('recipient').textContent = '20/10 · Chúc mừng ngày Phụ nữ Việt Nam';
$('recipientName').textContent = config.recipient;
$('introName').textContent = config.recipient;
$('mainWish').textContent = config.wish;
document.title = `Dành tặng ${config.recipient} · 20/10`;
music.volume = 0.35;

function announce(text) { $('status').textContent = text; }
function musicUI(playing) {
  $('soundButton').setAttribute('aria-pressed', String(playing));
  $('soundButton').setAttribute('aria-label', playing ? 'Tắt nhạc nền' : 'Bật nhạc nền');
  $('soundLabel').textContent = playing ? 'Đang phát' : 'Bật nhạc';
  $('soundIcon').textContent = playing ? '♪' : '♫';
}
async function playMusic() {
  const request = ++musicRequest;
  try {
    await music.play();
    if (request === musicRequest) musicUI(!music.paused);
  } catch {
    if (request === musicRequest) { musicUI(false); announce('Chưa phát được nhạc. Bạn có thể nhấn nút Bật nhạc để thử lại.'); }
  }
}
$('soundButton').addEventListener('click', () => {
  if (music.paused) playMusic();
  else { musicRequest++; music.pause(); musicUI(false); }
});
music.addEventListener('pause', () => musicUI(false));
music.addEventListener('play', () => musicUI(true));
music.addEventListener('error', () => { musicUI(false); announce('Không tải được nhạc nền.'); });

function unlockMemory(index) {
  if (unlockedMemories.has(index)) return;
  const memory = config.memories[index];
  if (!memory) return;
  unlockedMemories.add(index);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'memory-thumb';
  button.style.setProperty('--tilt', `${[-6, 4, -3, 5, -5][index % 5]}deg`);
  button.setAttribute('aria-label', `Mở ảnh ${index + 1}: ${memory.title}`);
  const image = document.createElement('img');
  image.src = memory.image;
  image.alt = memory.alt;
  image.loading = 'lazy';
  const caption = document.createElement('span');
  caption.textContent = 'memory';
  button.append(image, caption);
  button.addEventListener('click', () => openMemory(index));
  $('memoryStrip').append(button);
  $('memoryStrip').hidden = false;
}

function initPortrait() {
  if (portrait) return;
  try {
    portrait = createPortrait($('characterStage'), config.character, {
      onLoading(percent) { $('renderNotice').hidden = false; $('renderNotice').textContent = percent < 100 ? `Đang mở nhân vật 3D… ${percent}%` : 'Đang chuẩn bị chất liệu…'; },
      onReady() { $('renderNotice').hidden = true; announce('Nhân vật 3D đã sẵn sàng. Kéo để xoay 360 độ.'); },
      onError(message) { $('renderNotice').textContent = message; $('renderNotice').hidden = false; announce(message); }
    });
  } catch (error) {
    console.error('Không khởi tạo được WebGL:', error);
    const fallback = document.createElement('div');
    fallback.className = 'fallback-character';
    fallback.textContent = '💐';
    $('characterStage').append(fallback);
    $('renderNotice').hidden = false;
    $('renderNotice').textContent = 'Trình duyệt này chưa hỗ trợ đồ họa 3D. Bạn vẫn có thể xem lời chúc và ảnh.';
  }
}

function confettiBurst(x = innerWidth / 2, y = innerHeight * 0.5, amount = 42) {
  if (reducedMotion) return;
  const shapes = ['✿', '❀', '·', '✧'];
  const colors = ['#ba7182', '#81987d', '#d1ad72', '#c4a0ab'];
  for (let i = 0; i < amount; i++) {
    const particle = document.createElement('span');
    particle.className = 'confetti';
    particle.textContent = shapes[i % shapes.length];
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 290;
    Object.entries({ '--x': `${x}px`, '--y': `${y}px`, '--dx': `${Math.cos(angle) * distance}px`, '--dy': `${Math.sin(angle) * distance + 80}px`, '--spin': `${Math.random() * 600 - 300}deg`, '--duration': `${1.1 + Math.random()}s`, '--size': `${12 + Math.random() * 17}px`, '--color': colors[i % colors.length] }).forEach(([key, value]) => particle.style.setProperty(key, value));
    $('confettiLayer').append(particle);
    particle.addEventListener('animationend', () => particle.remove(), { once: true });
    setTimeout(() => particle.remove(), 2400);
  }
}

function createFallingIcon() {
  if (!opened || !config.memories.length || document.hidden || dialog.open || $('fallingLayer').childElementCount >= (reducedMotion ? 4 : 24)) return;
  const decoration = config.fallingIcons[Math.floor(Math.random() * config.fallingIcons.length)];
  const icon = document.createElement('button');
  icon.type = 'button';
  icon.className = 'falling-icon';
  icon.textContent = decoration;
  icon.setAttribute('aria-label', 'Mở ảnh và lời chúc tiếp theo');
  // Alternate left, middle and right, randomizing within each third.
  const lane = (fallingSpawnIndex++ % 3 + Math.random()) / 3;
  const iconSize = innerWidth <= 650 ? 39 : 47;
  const x = 28 + lane * Math.max(0, innerWidth - iconSize - 56);
  const duration = 8 + Math.random() * 4;
  icon.style.setProperty('--x', `${x}px`);
  icon.style.setProperty('--duration', `${duration}s`);
  icon.style.setProperty('--static-y', `${26 + Math.random() * 42}svh`);
  icon.addEventListener('click', () => {
    if (!opened || dialog.open || icon.disabled) return;
    icon.disabled = true;
    const index = nextMemoryIndex;
    nextMemoryIndex = (nextMemoryIndex + 1) % config.memories.length;
    const bounds = icon.getBoundingClientRect();
    confettiBurst(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, 12);
    unlockMemory(index);
    openMemory(index);
    icon.remove();
  });
  icon.addEventListener('animationend', () => { if (document.activeElement !== icon) icon.remove(); });
  $('fallingLayer').append(icon);
}
function startFalling() {
  stopFalling();
  fallingSpawnIndex = 0;
  for (let i = 0; i < (reducedMotion ? 1 : 3); i++) createFallingIcon();
  fallingTimer = setInterval(createFallingIcon, reducedMotion ? 3000 : 650);
}
function stopFalling() {
  clearInterval(fallingTimer);
  fallingTimer = null;
  $('fallingLayer').replaceChildren();
}

function displayMemory(index) {
  if (!unlockedMemories.has(index)) return;
  const memory = config.memories[index];
  $('memoryTitle').textContent = memory.title;
  $('memoryImage').src = memory.image;
  $('memoryImage').alt = memory.alt;
  $('memoryText').textContent = memory.text;
  $('photoNumber').textContent = 'memory';
}
function openMemory(index) {
  if (!opened || !unlockedMemories.has(index)) return;
  displayMemory(index);
  if (!dialog.open) {
    previousFocus = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    $('closeDialog').focus();
  }
}
$('closeDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  if (!opened) return;
  if (previousFocus?.isConnected) previousFocus.focus();
  else $('memoryStrip').querySelector('button')?.focus();
});

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
$('giftButton').addEventListener('click', async () => {
  if (opening || opened) return;
  opening = true;
  resetMemories();
  $('giftButton').disabled = true;
  initPortrait();
  // Start audio directly from the click, before any asynchronous animation.
  if (music.paused) playMusic();
  $('giftScene').classList.add('opening');
  confettiBurst(innerWidth / 2, innerHeight * 0.5, 72);
  await delay(reducedMotion ? 10 : 1050);
  $('intro').classList.add('leaving');
  await delay(reducedMotion ? 10 : 350);
  $('intro').hidden = true;
  $('celebration').hidden = false;
  opened = true;
  opening = false;
  portrait?.show();
  $('greetingTitle').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
  startFalling();
  announce(`Đã mở quà dành tặng ${config.recipient}. Chúc mừng ngày Phụ nữ Việt Nam 20 tháng 10!`);
});
function closeGift() {
  opened = false;
  opening = false;
  stopFalling();
  resetMemories();
  $('bouquet').classList.remove('received');
  $('flowerButton').disabled = false;
  $('flowerButton').textContent = 'Nhận bó hoa này nhé';
  $('flowerNote').textContent = 'Một bó hoa nhỏ, cùng những lời chúc thật vui.';
  portrait?.hide();
  portrait?.reset();
  $('celebration').hidden = true;
  $('intro').hidden = false;
  $('intro').classList.remove('leaving');
  $('giftScene').classList.remove('opening');
  $('giftButton').disabled = false;
  $('confettiLayer').replaceChildren();
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('giftButton').focus({ preventScroll: true });
}
$('replayButton').addEventListener('click', closeGift);
$('flowerButton').addEventListener('click', () => {
  if (!opened || $('flowerButton').disabled) return;
  $('bouquet').classList.add('received');
  $('flowerButton').disabled = true;
  $('flowerButton').textContent = 'Hoa đã dành tặng cậu ✿';
  $('flowerNote').textContent = 'Chúc cậu luôn rạng rỡ theo cách của riêng mình!';
  confettiBurst(innerWidth / 2, innerHeight * 0.45, 60);
  announce('Đã nhận bó hoa. Chúc cậu một ngày 20 tháng 10 thật vui!');
});
window.addEventListener('pageshow', event => { if (event.persisted) closeGift(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopFalling();
  else if (opened) startFalling();
});
