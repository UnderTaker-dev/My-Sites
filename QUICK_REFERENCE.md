# Quick Reference Guide - New Features

## 🔔 Toast Notification System

### Usage:
```javascript
// New improved method (recommended)
showToast('Your message here', '#1abc9c'); // Green/Success
showToast('Error message', '#e74c3c');     // Red/Error
showToast('Warning message', '#f39c12');   // Orange/Warning
showToast('Info message', '#3498db');      // Blue/Info

// Automatically converts to new toast system with icons:
// #1abc9c, #2ecc71 → Success (✓)
// #e74c3c → Error (✕)
// #f39c12, #e67e22 → Warning (⚠)
// #3498db → Info (ℹ)
```

### Features:
- ✅ Auto-dismiss after 4 seconds
- ✅ Click to dismiss immediately
- ✅ Stacks multiple toasts
- ✅ Beautiful gradients with icons
- ✅ Smooth slide animations

---

## 📧 Newsletter Form

### Improvements:
- ✅ Real-time email validation
- ✅ Error shake animation for invalid input
- ✅ Success pulse animation on successful subscription
- ✅ Loading spinner during submission
- ✅ Better error messages

### Validation:
- Checks for valid email format
- Trims whitespace
- Shows visual feedback immediately
- Focuses on error field

---

## 🎨 CSS Variables

### Usage in Your Code:
```css
/* Colors */
color: var(--color-primary);    /* #3498db */
color: var(--color-secondary);  /* #9b59b6 */
color: var(--color-accent);     /* #e74c3c */
color: var(--color-success);    /* #2ecc71 */

/* Spacing */
padding: var(--spacing-sm);     /* 1rem */
margin: var(--spacing-lg);      /* 2rem */

/* Border Radius */
border-radius: var(--radius-md); /* 12px */

/* Shadows */
box-shadow: var(--shadow-lg);    /* Depth effect */

/* Transitions */
transition: all var(--transition-base); /* 0.3s ease */

/* Gradients */
background: var(--gradient-primary);
```

---

## 🎯 Animations

### Available Animations:
```css
animation: fadeIn 0.6s ease;
animation: slideDown 0.8s cubic-bezier(0.4, 0, 0.2, 1);
animation: slideUp 0.8s ease;
animation: scaleIn 0.5s ease;
animation: errorShake 0.5s;
animation: successPulse 0.6s;
animation: spin 0.6s linear infinite;
animation: shimmer 1.5s infinite;
animation: gradientShift 3s ease infinite;
```

### Usage:
```css
.my-element {
  animation: slideDown 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  animation-delay: 0.2s;
  animation-fill-mode: both;
}
```

---

## ✨ Loading States

### Add to Buttons:
```javascript
const btn = document.getElementById('myButton');

// Add loading state
btn.disabled = true;
btn.classList.add('btn-loading');

// Remove after async operation
.finally(() => {
  btn.disabled = false;
  btn.classList.remove('btn-loading');
});
```

### Visual Effect:
- Button text becomes transparent
- Centered spinning loader appears
- Button is disabled (non-clickable)

---

## 🎭 Utility Classes

### Accessibility:
```html
<span class="sr-only">Hidden from view, visible to screen readers</span>
```

### Animations:
```html
<div class="error-shake">Shakes on error</div>
<div class="success-pulse">Pulses on success</div>
```

### Loading:
```html
<button class="btn-loading">Shows spinner</button>
```

### Gradient Text:
```html
<h1 class="gradient-text">Animated gradient text</h1>
```

---

## 🎨 Color System

### Primary Colors:
- `--color-primary`: #3498db (Blue)
- `--color-secondary`: #9b59b6 (Purple)
- `--color-accent`: #e74c3c (Red)

### Status Colors:
- `--color-success`: #2ecc71 (Green)
- `--color-warning`: #f39c12 (Orange)
- `--color-info`: #1abc9c (Teal)

### Usage:
```javascript
showToast('Success!', '#2ecc71');  // Green
showToast('Error!', '#e74c3c');    // Red
showToast('Warning!', '#f39c12');  // Orange
showToast('Info!', '#3498db');     // Blue
```

---

## 📱 Responsive Features

### Fluid Typography:
```css
font-size: clamp(2.5rem, 8vw, 4rem);
/* Min: 2.5rem, Preferred: 8vw, Max: 4rem */
```

### Breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## ⚡ Performance Tips

### Use GPU Acceleration:
```css
.my-element {
  transform: translateZ(0);
  will-change: transform;
}
```

### Optimize Animations:
```css
/* Good - GPU accelerated */
transform: translateY(-10px);
opacity: 0.5;

/* Avoid - causes repaints */
margin-top: -10px;
height: 200px;
```

---

## 🔍 SEO Checklist

✅ Meta description  
✅ Open Graph tags  
✅ Twitter Cards  
✅ Semantic HTML  
✅ Proper heading hierarchy  
✅ Alt tags for images  
✅ Descriptive title  
✅ Keywords meta tag  

---

## ♿ Accessibility Features

### Keyboard Navigation:
- Tab through interactive elements
- Enter/Space to activate buttons
- Esc to close modals
- Visible focus indicators

### Screen Reader Support:
- Semantic HTML landmarks
- ARIA labels where needed
- `.sr-only` for hidden text
- Proper heading hierarchy

### Motion Preferences:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations disabled for users who prefer reduced motion */
}
```

---

## 🎯 Form Validation

### Email Validation:
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  showToast('Invalid email', '#e74c3c');
  input.classList.add('error-shake');
}
```

### Visual Feedback:
- ✅ Real-time validation
- ✅ Error shake animation
- ✅ Success pulse animation
- ✅ Border color changes
- ✅ Focus on error field

---

## 🎨 Theme System

### Current Themes:
- Dark Mode (default)
- Light Mode
- Mood themes (happy, chill, focused, creative, dark, monochrome, neon, sunset, ocean, forest, gaming, cyberpunk, retro, pastel, autumn, winter, spring, summer, midnight, dawn, dusk, cosmic, matrix, vaporwave, synthwave, outrun, halloween, christmas, valentine, easter)

### Toggle Theme:
```javascript
toggleTheme(); // Switch between dark/light
```

---

**Quick tip**: Press F12 and check the Console for any errors or warnings during development! 🔧
