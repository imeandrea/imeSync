# imeSync

**imeSync** is a cross-platform desktop application for automatic file synchronization, built with **Electron** and **React**. It provides an intuitive graphical interface to manage rsync-based synchronization sessions with customizable triggers and real-time monitoring.

## 🚀 Key Features

- **Automatic Synchronization**: Scheduled backups and custom triggers
- **Modern Interface**: Responsive UI with dark/light theme support
- **Multi-trigger**: WiFi, file changes, scheduled times, intervals, system startup
- **Real-time Monitoring**: System statistics, detailed logs, notifications
- **Background Operation**: Runs silently in background with tray icon
- **Cross-platform**: Supports macOS, Windows and Linux
- **Advanced Controls**: Pause/resume individual or global sessions
- **Remote Management**: Browser for remote directories and rsync modules

## 🏗️ Architecture

### Frontend
- **Electron**: Cross-platform desktop application framework
- **React 18**: UI library with modern hooks
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first CSS framework for responsive styling
- **Vite**: Fast build tool for development and production

### Backend Core
- **rsync**: Main synchronization engine
- **Node.js**: Runtime for business logic and file system operations
- **IPC (Inter-Process Communication)**: Secure communication between main and renderer
- **File System Watchers**: Real-time file change monitoring
- **Cron Jobs**: Scheduling for time-based triggers

### Logging System
- **File-based Logging**: Persistent logs organized by session
- **Real-time Updates**: Log streaming to UI via IPC
- **Structured Logging**: Categorization by type (info, success, error, warning)
- **Log Rotation**: Automatic size and retention management

## 📋 Prerequisites

### Operating System
- **macOS**: 10.14 Mojave or higher
- **Windows**: 10/11 (64-bit)
- **Linux**: Ubuntu 18.04+, Fedora 32+, or equivalent distributions

### Runtime Dependencies
- **Node.js**: 18.0.0 or higher
- **rsync**: See detailed installation section

## 🔧 rsync Installation

### macOS

#### Method 1: Homebrew (Recommended)
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install rsync
brew install rsync

# Verify installation
rsync --version
```

#### Method 2: MacPorts
```bash
sudo port install rsync3
```

#### Method 3: Source compilation
```bash
# Download latest version from https://rsync.samba.org/
curl -O https://download.samba.org/pub/rsync/rsync-3.2.7.tar.gz
tar -xzf rsync-3.2.7.tar.gz
cd rsync-3.2.7
./configure
make
sudo make install
```

### Windows

#### Method 1: WSL2 (Windows Subsystem for Linux)
```bash
# Enable WSL2
wsl --install

# In WSL Ubuntu terminal
sudo apt update
sudo apt install rsync

# Verify installation
rsync --version
```

#### Method 2: Cygwin
1. Download installer from [cygwin.com](https://cygwin.com/install.html)
2. During installation, select **rsync** package from **Net** category
3. Complete installation
4. Open Cygwin Terminal and verify: `rsync --version`

#### Method 3: MSYS2
```bash
# Install MSYS2 from https://www.msys2.org/
# In MSYS2 terminal
pacman -S rsync

# Verify installation
rsync --version
```

#### Method 4: Scoop Package Manager
```powershell
# Install Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install rsync
scoop install rsync
```

### Linux

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install rsync

# For advanced features
sudo apt install rsync openssh-client openssh-server
```

#### CentOS/RHEL/Fedora
```bash
# CentOS/RHEL 7/8
sudo yum install rsync

# CentOS Stream/RHEL 9/Fedora
sudo dnf install rsync
```

#### Arch Linux
```bash
sudo pacman -S rsync
```

#### openSUSE
```bash
sudo zypper install rsync
```

## 🖥️ rsync Server Configuration (Optional)

For remote synchronizations, you can configure an rsync daemon:

### Basic Configuration
1. **Create configuration file** `/etc/rsyncd.conf`:
```ini
# /etc/rsyncd.conf
uid = nobody
gid = nogroup
use chroot = no
max connections = 4
syslog facility = local5
pid file = /var/run/rsyncd.pid
lock file = /var/run/rsync.lock

[backup]
    path = /home/backup
    comment = Backup Directory
    read only = false
    list = yes
    uid = rsync
    gid = rsync
    auth users = syncuser
    secrets file = /etc/rsyncd.secrets
    hosts allow = 192.168.1.0/24
```

2. **Create secrets file** `/etc/rsyncd.secrets`:
```
syncuser:password123
```

3. **Set permissions**:
```bash
sudo chmod 600 /etc/rsyncd.secrets
sudo chown root:root /etc/rsyncd.secrets
```

4. **Start daemon**:
```bash
# Systemd (Ubuntu/CentOS/Fedora)
sudo systemctl enable rsync
sudo systemctl start rsync

# Or manually
sudo rsync --daemon
```

### SSH Configuration (Secure Alternative)
```bash
# Generate SSH keys
ssh-keygen -t rsa -b 4096 -f ~/.ssh/rsync_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/rsync_key.pub user@remote-server

# Test connection
ssh -i ~/.ssh/rsync_key user@remote-server
```

## 🚀 Application Installation

### Development
```bash
# Clone repository
git clone https://github.com/imeandrea/imesync.git
cd imesync

# Install dependencies
npm install

# Start in development mode
npm start

# Build for production
npm run make
```

### Release
1. Download latest release from [GitHub Releases](https://github.com/imeandrea/imesync/releases)
2. **macOS**: Open `.dmg` file and drag app to Applications folder
3. **Windows**: Run `.exe` file and follow installer
4. **Linux**: Install `.deb`, `.rpm`, or `.AppImage` package

## 📖 Basic Usage

### First Launch
1. **Launch imeSync** - The app will show the main window
2. **Check rsync** - The app will automatically verify rsync installation
3. **Create first session** - Click "New Session" to configure first synchronization

### Session Creation
1. **Basic Information**:
   - **Name**: Session identifier
   - **Description**: Optional details

2. **Paths**:
   - **Source**: Local directory to synchronize
   - **Destination**: Local or remote destination directory

3. **Remote Connection** (if needed):
   - **Host**: IP address or hostname
   - **Username**: Username for connection
   - **Password/SSH Key**: Access credentials

4. **Triggers**:
   - **Schedule**: Fixed times (e.g. daily at 2:00)
   - **Interval**: Regular intervals (e.g. every 30 minutes)
   - **WiFi**: When connected to specific networks
   - **File Changes**: When file changes are detected
   - **Startup**: At application startup

5. **Advanced Options**:
   - **rsync Flags**: Custom parameters
   - **Exclusions**: File patterns to ignore
   - **Bandwidth**: Transfer speed limitation

### Session Management
- **Start Sync**: Play button for immediate synchronization
- **Pause/Resume**: Individual or global level control
- **Edit**: Modify existing configuration
- **Delete**: Permanent removal
- **View Logs**: Analysis of details and errors

### Menu and Controls
- **Toolbar**: Quick access to main functions
- **Tray Icon**: Background control and context menu
- **Settings**: App configuration, permissions, paths
- **Help**: rsync installation guide

## 🔍 Troubleshooting

### rsync not found
```bash
# Verify installation
which rsync
rsync --version

# Check PATH
echo $PATH

# Reinstall if needed (see installation section)
```

### SSH Connection Errors
```bash
# Test manual connection
ssh user@remote-host

# Verify SSH keys
ssh-add -l
ssh-agent bash
ssh-add ~/.ssh/id_rsa
```

### Permission Issues
- **macOS**: Grant "Full Disk Access" in System Preferences → Security & Privacy
- **Linux**: Verify source/destination directory permissions
- **Windows**: Run as administrator if needed

### Logging and Debugging
1. **View Logs**: Button in main toolbar
2. **Console**: Open Dev Tools (Cmd/Ctrl+Alt+I) in development mode
3. **File Log**: Open log folder from Settings → Paths

## 🤝 Contributions

Contributions are welcome! Please:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Local Development
```bash
# Environment setup
git clone https://github.com/imeandrea/imesync.git
cd imesync
npm install

# Linting
npm run lint

# Build
npm run make

# Test (if available)
npm test
```

## 📄 License

This project is released under [GNU General Public License v3.0](LICENSE). See the `LICENSE` file for complete details.

## 🙏 Acknowledgments

- **rsync team** for the excellent synchronization tool
- **Electron** for the cross-platform framework
- **React** and **TypeScript** communities
- All contributors and beta testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/imeandrea/imesync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/imeandrea/imesync/discussions)

---

**imeSync** - Simple, powerful and reliable file synchronization 🚀