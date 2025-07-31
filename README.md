# Constituent Contact Management App

A comprehensive web application for managing constituent outreach and call tracking for political campaigns, advocacy groups, and organizations.

## 🚀 Features

### Core Functionality
- **Representative Management**: Add, edit, and manage contact information for elected officials
- **Call Script Creation**: Create and manage call scripts with AI-powered generation
- **Multi-Call Workflow**: Select multiple representatives and track call status
- **Call Logging**: Log call outcomes, notes, and follow-up actions
- **Analytics Dashboard**: Comprehensive analytics with charts and data visualization

### Key Features
- **AI Script Generation**: Generate call scripts using local AI templates
- **Mobile-Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Analytics**: Track call patterns, outcomes, and effectiveness
- **Data Export**: Export call logs and analytics data
- **Multi-User Ready**: Architecture supports user management (coming soon)

## 📊 Analytics Dashboard

The app includes a powerful analytics dashboard with:
- **Call Outcome Analysis**: Person/Voicemail/Failed breakdown
- **Call Volume Trends**: Daily call patterns over time
- **Representative Analysis**: Calls by representative
- **Script Usage**: Calls by script type
- **Interactive Charts**: Beautiful visualizations using Chart.js

## 🛠️ Technology Stack

- **Backend**: Flask (Python)
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Deployment**: Gunicorn (WSGI server)

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd rep_contact_app
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python3 app.py
   ```

4. **Access the app**
   - Open your browser to `http://localhost:8080`
   - The app will automatically initialize with sample data

## 📱 Usage

### Making Calls
1. **Step 1**: Enter your zip code to find representatives
2. **Step 2**: Select representatives and phone numbers to call
3. **Step 3**: Choose or create a call script
4. **Step 4**: Execute calls and log outcomes

### Analytics
- Navigate to the "Analyze Calls" tab
- View comprehensive analytics and charts
- Filter data by date range and outcomes
- Export call history and statistics

## 🗄️ Database Schema

### Core Tables
- **Representatives**: Contact information for elected officials
- **CallScripts**: Reusable call scripts and templates
- **CallLogs**: Detailed call history and outcomes
- **Users**: User management (coming soon)

## 🔧 Configuration

The app uses environment-based configuration:
- **Development**: Debug mode enabled, local database
- **Production**: Debug disabled, production database

## 🚀 Deployment

### Local Development
```bash
python3 app.py
```

### Production Deployment
```bash
gunicorn -w 4 -b 0.0.0.0:8080 wsgi:app
```

## 📈 Roadmap

- [ ] User authentication and management
- [ ] Advanced analytics and reporting
- [ ] Email integration for follow-ups
- [ ] Mobile app development
- [ ] API for third-party integrations
- [ ] Advanced AI script generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

## 🙏 Acknowledgments

- Built with Flask and Bootstrap
- Charts powered by Chart.js
- Icons from Font Awesome
- AI script generation using local templates

---

**Built with ❤️ for effective constituent engagement** 