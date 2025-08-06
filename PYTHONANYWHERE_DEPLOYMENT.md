# PythonAnywhere Deployment Guide

## Quick Deployment

1. **SSH into PythonAnywhere**
   ```bash
   ssh yourusername@ssh.pythonanywhere.com
   ```

2. **Navigate to your project**
   ```bash
   cd your-project-directory
   ```

3. **Run the automated deployment script**
   ```bash
   python3 deploy_to_pythonanywhere.py
   ```

4. **Reload your web app**
   - Go to PythonAnywhere dashboard
   - Navigate to Web tab
   - Click "Reload" button

## What the Script Does

The automated deployment script handles:

- ✅ **Git Pull**: Gets latest changes
- ✅ **Dependencies**: Installs python-dotenv
- ✅ **Database Migration**: Adds is_test_data column
- ✅ **Data Preservation**: Keeps existing call logs
- ✅ **File Permissions**: Sets correct database permissions
- ✅ **Cache Cleanup**: Removes old Python cache files

## Manual Steps (if needed)

If the automated script fails, you can run these steps manually:

### Database Migration
```python
python3
```
```python
from app import app, db, CallLog
with app.app_context():
    # Add new column
    db.engine.execute('ALTER TABLE call_log ADD COLUMN is_test_data BOOLEAN DEFAULT FALSE')
    # Mark existing as test data
    db.engine.execute('UPDATE call_log SET is_test_data = TRUE')
    db.session.commit()
```

### Install Dependencies
```bash
pip install --user python-dotenv==1.0.0
```

### Set Permissions
```bash
chmod 666 instance/rep_contacts.db
```

## Troubleshooting

### Issue: "No module named 'dotenv'"
**Solution**: Run `pip install --user python-dotenv==1.0.0`

### Issue: Database errors
**Solution**: The script will handle this automatically

### Issue: Static files not updating
**Solution**: Clear browser cache or add `?v=timestamp` to URLs

### Issue: Web app not reloading
**Solution**: Check PythonAnywhere dashboard for error messages

## New Features in This Update

- 🎯 **Reference Parameters**: `@RepType`, `@LastName`, `@ZipCode`
- 🤖 **Enhanced AI**: Better script generation with parameters
- 📱 **UI Improvements**: Position badges, no scrolling
- 🧪 **Test Data System**: Distinguish real vs test calls
- 📊 **Clean Logging**: Reduced terminal output

## Testing After Deployment

1. **Test Reference Parameters**:
   - Create a script with `@RepType @LastName @ZipCode`
   - Check that it processes correctly in Step 4

2. **Test AI Generation**:
   - Try generating a script with AI
   - Verify it includes reference parameters

3. **Test Analytics**:
   - Check that test data filtering works
   - Verify call logs display correctly

4. **Test Mobile**:
   - Check responsive design on mobile devices 