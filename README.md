# 🌐 Personal Website

Professional personal portfolio website.

## 🎯 What's Included

- Personal portfolio/website
- Admin dashboard with tabs
- Tech stack showcase
- Newsletter subscription
- Page view tracking
- Donation system

## 🚀 Quick Start

1. Clone repository
2. Deploy to Netlify
3. Configure environment variables
4. Done!

## 🏗️ Project Structure

```
website-my-domain/
├── index.html                      # Main website
├── admin-tabs.html                 # Admin dashboard
├── .env                            # Environment variables
│
├── netlify/functions/              # Serverless Functions
│   ├── get-site-settings.js       # Site configuration
│   ├── save-site-settings.js      # Settings update
│   ├── subscribe.js               # Newsletter signup
│   └── ...                        # Other functions
│
└── airtable-import-templates/      # Legacy Airtable tools
```

## 🚀 Deployment

### Website Hosting
- Netlify (recommended)
- Vercel
- GitHub Pages
- Any static host

## 🔧 Environment Variables

```env
# Airtable
AIRTABLE_API_KEY=your_key
AIRTABLE_BASE_ID=your_base_id

# Stripe (optional)
STRIPE_PUBLISHABLE_KEY=your_key
STRIPE_SECRET_KEY=your_secret

# Admin credentials
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
```

## 🔐 Security

- ✅ Credentials in environment variables only
- ✅ No credentials in code
- ✅ Admin dashboard requires authentication
- ✅ Rate limiting handled
- ✅ Input validation on all inputs
- ✅ HTTPS enforced
- Auto-close tickets
- Keyword tagging
- AI suggestions
- Canned responses

## 🤝 Contributing

This is a personal project, but feel free to:
- Fork for your own use
- Submit bug reports
- Suggest improvements
- Share your customizations

## 📄 License

MIT License - Use freely for personal or commercial projects.

## 📄 License

MIT License - Use freely for personal or commercial projects.

---

**Last Updated**: 2025
