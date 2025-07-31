# Representative Contact App

A web application that helps US citizens contact their government representatives by providing a convenient place to store representatives' contact information and call scripts.

## Features

### Version 1.0
- **Zip Code Entry**: Enter your zip code to find representatives
- **Representative Management**: View existing representatives or add new ones manually
- **Call Scripts**: Create and save personalized call scripts
- **Responsive Design**: Works on both desktop and mobile devices
- **SQLite Database**: Simple, local database storage

### Planned Features (v2+)
- Automatic API integration for representative lookup
- Multiple script management and history
- AI-powered script generation based on topics

## Installation & Setup

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Run the Application
```bash
python app.py
```

### Step 3: Access the Application
Open your web browser and navigate to:
```
http://localhost:5000
```

## How to Use

### 1. Enter Your Zip Code
- Type your 5-digit zip code in the input field
- Click "Find Representatives" or press Enter

### 2. View/Add Representatives
- If representatives are found for your zip code, they will be displayed
- If no representatives are found, you can add them manually
- Click the "Call" button next to any representative to initiate a call

### 3. Create Call Scripts
- Enter a title for your script
- Write your call script in the text area
- Click "Save Script" to store it
- Use the "Use Script" button to view your script in a call modal

### 4. Make Calls
- Click "Call" on any representative card
- Use the "Use Script" button on any saved script
- The modal will show the representative info and your script
- Click "Call Now" to initiate the phone call

## Database Structure

### Representatives Table
- `id`: Primary key
- `zip_code`: 5-digit zip code
- `name`: Representative's name
- `phone`: Contact phone number
- `position`: Role (Senator, Representative, etc.)
- `created_at`: Timestamp

### Call Scripts Table
- `id`: Primary key
- `title`: Script title
- `content`: Script content
- `zip_code`: Associated zip code
- `created_at`: Timestamp

## Sample Data

The application comes with sample data for testing:
- **Zip Code 10001**: Senator John Smith, Representative Jane Doe
- **Zip Code 90210**: Senator Bob Johnson, Representative Alice Brown
- Sample scripts for climate change and healthcare reform

## File Structure

```
rep_contact_app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Custom styles
    └── js/
        └── app.js        # Frontend JavaScript
```

## API Endpoints

- `GET /api/representatives/<zip_code>` - Get representatives for a zip code
- `POST /api/representatives` - Add a new representative
- `GET /api/scripts/<zip_code>` - Get scripts for a zip code
- `POST /api/scripts` - Save a new script
- `DELETE /api/scripts/<id>` - Delete a script

## Technologies Used

- **Backend**: Flask (Python web framework)
- **Database**: SQLite with SQLAlchemy ORM
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome

## Development

### Running in Development Mode
The application runs in debug mode by default, which provides:
- Automatic reloading when files change
- Detailed error messages
- Debug console

### Database Management
The SQLite database (`rep_contacts.db`) is automatically created when you first run the application. It includes sample data for testing.

## Troubleshooting

### Common Issues

1. **Port already in use**: If port 5000 is busy, the application will show an error. You can modify the port in `app.py`.

2. **Database errors**: If you encounter database issues, delete the `rep_contacts.db` file and restart the application.

3. **Missing dependencies**: Make sure all requirements are installed with `pip install -r requirements.txt`.

### Getting Help
If you encounter any issues:
1. Check the console output for error messages
2. Ensure all dependencies are installed
3. Verify Python version is 3.7 or higher

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the application. 