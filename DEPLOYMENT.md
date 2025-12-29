# Deployment Checklist

## ✅ Pre-Deployment Security Check

### Backend Security
- ✅ `.env` file is in `.gitignore` - API keys are safe
- ✅ OpenAI API key is read from environment variables only
- ✅ No hardcoded credentials in code
- ✅ CORS is configured (currently allows localhost:5173 - update for production)

### Frontend Security
- ✅ API URL is configurable via environment variables
- ✅ No hardcoded API keys or secrets
- ✅ `.env` files are in `.gitignore`

## 🔧 Required Changes for Production

### Backend (.env file)
Create a `.env` file in the `backend/` directory:
```env
OPENAI_API_KEY=your_production_api_key_here
PORT=3000
NODE_ENV=production
```

### Frontend (.env file)
Create a `.env.production` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Backend CORS Configuration
Update `backend/src/main.ts` to allow your production frontend domain:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});
```

## 📦 Build Commands

### Backend
```bash
cd backend
npm install
npm run build
npm run start:prod
```

### Frontend
```bash
cd frontend
npm install
npm run build
# Deploy the 'dist' folder to your hosting service
```

## 🚀 Deployment Steps

1. **Set Environment Variables**
   - Backend: Set `OPENAI_API_KEY` and `PORT`
   - Frontend: Set `VITE_API_BASE_URL` to your backend URL

2. **Build Backend**
   ```bash
   cd backend
   npm install --production
   npm run build
   ```

3. **Build Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

4. **Deploy**
   - Backend: Deploy the `dist` folder and run `npm run start:prod`
   - Frontend: Deploy the `dist` folder to static hosting (Vercel, Netlify, etc.)

## ⚠️ Important Notes

- **Never commit `.env` files** - They contain sensitive API keys
- **Update CORS** - Change allowed origins for production
- **Use HTTPS** - Always use HTTPS in production
- **Environment Variables** - Set them in your hosting platform's dashboard

## 🔒 Security Best Practices

1. ✅ API keys stored in environment variables
2. ✅ `.env` files in `.gitignore`
3. ✅ No secrets in code
4. ⚠️ Update CORS for production domain
5. ⚠️ Use HTTPS in production
6. ⚠️ Consider rate limiting for API endpoints
