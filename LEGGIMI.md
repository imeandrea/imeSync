# imeSync

**imeSync** è un'applicazione desktop multipiattaforma per la sincronizzazione automatica dei file, costruita con **Electron** e **React**. Fornisce un'interfaccia grafica intuitiva per gestire sessioni di sincronizzazione basate su **rsync** con trigger personalizzabili e monitoraggio in tempo reale.

## 🚀 Caratteristiche Principali

- **Sincronizzazione Automatica**: Backup programmati e trigger personalizzati
- **Interfaccia Moderna**: UI responsive con supporto tema scuro/chiaro
- **Multi-trigger**: WiFi, modifiche file, orari programmati, intervalli, avvio sistema
- **Monitoraggio Real-time**: Statistiche sistema, log dettagliati, notifiche
- **Background Operation**: Funziona silenziosamente in background con tray icon
- **Cross-platform**: Supporta macOS, Windows e Linux
- **Controlli Avanzati**: Pausa/riprendi sessioni singole o globali
- **Gestione Remota**: Browser per directory remote e moduli rsync

## 🏗️ Architettura

### Frontend
- **Electron**: Framework per applicazioni desktop cross-platform
- **React 18**: Libreria UI con hooks moderni
- **TypeScript**: Type safety e migliore developer experience
- **Tailwind CSS**: Framework CSS utility-first per styling responsive
- **Vite**: Build tool veloce per sviluppo e produzione

### Backend Core
- **rsync**: Motore di sincronizzazione principale
- **Node.js**: Runtime per logica business e file system operations
- **IPC (Inter-Process Communication)**: Comunicazione sicura tra main e renderer
- **File System Watchers**: Monitoraggio modifiche file in tempo reale
- **Cron Jobs**: Scheduling per trigger temporizzati

### Sistema di Log
- **File-based Logging**: Log persistenti organizzati per sessione
- **Real-time Updates**: Streaming log verso UI via IPC
- **Structured Logging**: Categorizzazione per tipo (info, success, error, warning)
- **Log Rotation**: Gestione automatica dimensione e retention

## 📋 Prerequisiti

### Sistema Operativo
- **macOS**: 10.14 Mojave o superiore
- **Windows**: 10/11 (64-bit)
- **Linux**: Ubuntu 18.04+, Fedora 32+, o distribuzioni equivalenti

### Dipendenze Runtime
- **Node.js**: 18.0.0 o superiore
- **rsync**: Vedi sezione installazione dettagliata

## 🔧 Installazione rsync

### macOS

#### Metodo 1: Homebrew (Raccomandato)
```bash
# Installa Homebrew se non presente
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installa rsync
brew install rsync

# Verifica installazione
rsync --version
```

#### Metodo 2: MacPorts
```bash
sudo port install rsync3
```

#### Metodo 3: Compilazione da sorgenti
```bash
# Scarica l'ultima versione da https://rsync.samba.org/
curl -O https://download.samba.org/pub/rsync/rsync-3.2.7.tar.gz
tar -xzf rsync-3.2.7.tar.gz
cd rsync-3.2.7
./configure
make
sudo make install
```

### Windows

#### Metodo 1: WSL2 (Windows Subsystem for Linux)
```bash
# Abilita WSL2
wsl --install

# Nel terminale WSL Ubuntu
sudo apt update
sudo apt install rsync

# Verifica installazione
rsync --version
```

#### Metodo 2: Cygwin
1. Scarica l'installer da [cygwin.com](https://cygwin.com/install.html)
2. Durante l'installazione, seleziona il pacchetto **rsync** dalla categoria **Net**
3. Completa l'installazione
4. Apri Cygwin Terminal e verifica: `rsync --version`

#### Metodo 3: MSYS2
```bash
# Installa MSYS2 da https://www.msys2.org/
# Nel terminale MSYS2
pacman -S rsync

# Verifica installazione
rsync --version
```

#### Metodo 4: Scoop Package Manager
```powershell
# Installa Scoop
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Installa rsync
scoop install rsync
```

### Linux

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install rsync

# Per funzionalità avanzate
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

## 🖥️ Configurazione Server rsync (Opzionale)

Per sincronizzazioni remote, puoi configurare un demone rsync:

### Configurazione Base
1. **Crea file di configurazione** `/etc/rsyncd.conf`:
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

2. **Crea file secrets** `/etc/rsyncd.secrets`:
```
syncuser:password123
```

3. **Imposta permessi**:
```bash
sudo chmod 600 /etc/rsyncd.secrets
sudo chown root:root /etc/rsyncd.secrets
```

4. **Avvia il demone**:
```bash
# Systemd (Ubuntu/CentOS/Fedora)
sudo systemctl enable rsync
sudo systemctl start rsync

# O manualmente
sudo rsync --daemon
```

### Configurazione SSH (Alternativa Sicura)
```bash
# Genera chiavi SSH
ssh-keygen -t rsa -b 4096 -f ~/.ssh/rsync_key

# Copia chiave pubblica sul server
ssh-copy-id -i ~/.ssh/rsync_key.pub user@remote-server

# Testa connessione
ssh -i ~/.ssh/rsync_key user@remote-server
```

## 🚀 Installazione Applicazione

### Sviluppo
```bash
# Clone repository
git clone https://github.com/imeandrea/imesync.git
cd imesync

# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm start

# Build per produzione
npm run make
```

### Rilascio
1. Scarica l'ultima release da [GitHub Releases](https://github.com/imeandrea/imesync/releases)
2. **macOS**: Apri il file `.dmg` e trascina l'app nella cartella Applications
3. **Windows**: Esegui il file `.exe` e segui l'installer
4. **Linux**: Installa il pacchetto `.deb`, `.rpm`, o `.AppImage`

## 📖 Utilizzo Base

### Primo Avvio
1. **Avvia imeSync** - L'app mostrerà la finestra principale
2. **Controlla rsync** - L'app verificherà automaticamente l'installazione di rsync
3. **Crea prima sessione** - Clicca "New Session" per configurare la prima sincronizzazione

### Creazione Sessione
1. **Informazioni Base**:
   - **Nome**: Identificativo della sessione
   - **Descrizione**: Dettagli opzionali

2. **Percorsi**:
   - **Sorgente**: Directory locale da sincronizzare
   - **Destinazione**: Directory locale o remota di destinazione

3. **Connessione Remota** (se necessario):
   - **Host**: Indirizzo IP o hostname
   - **Username**: Nome utente per connessione
   - **Password/SSH Key**: Credenziali di accesso

4. **Trigger**:
   - **Schedule**: Orari fissi (es. ogni giorno alle 2:00)
   - **Interval**: Intervalli regolari (es. ogni 30 minuti)
   - **WiFi**: Quando connesso a reti specifiche
   - **File Changes**: Al rilevamento di modifiche file
   - **Startup**: All'avvio dell'applicazione

5. **Opzioni Avanzate**:
   - **Flags rsync**: Parametri personalizzati
   - **Esclusioni**: Pattern di file da ignorare
   - **Bandwidth**: Limitazione velocità trasferimento

### Gestione Sessioni
- **Avvia Sync**: Pulsante play per sincronizzazione immediata
- **Pausa/Riprendi**: Controllo a livello singolo o globale
- **Edit**: Modifica configurazione esistente
- **Delete**: Rimozione permanente
- **View Logs**: Analisi dettagli ed errori

### Menu e Controlli
- **Toolbar**: Accesso rapido a funzioni principali
- **Tray Icon**: Controllo background e menu contestuale
- **Settings**: Configurazione app, permessi, percorsi
- **Help**: Guida installazione rsync

## 🔍 Risoluzione Problemi

### rsync non trovato
```bash
# Verifica installazione
which rsync
rsync --version

# Controlla PATH
echo $PATH

# Reinstalla se necessario (vedi sezione installazione)
```

### Errori Connessione SSH
```bash
# Testa connessione manuale
ssh user@remote-host

# Verifica chiavi SSH
ssh-add -l
ssh-agent bash
ssh-add ~/.ssh/id_rsa
```

### Problemi Permessi
- **macOS**: Concedi "Full Disk Access" nelle Preferenze Sistema → Sicurezza e Privacy
- **Linux**: Verifica permessi directory sorgente/destinazione
- **Windows**: Esegui come amministratore se necessario

### Log e Debugging
1. **View Logs**: Pulsante nella toolbar principale
2. **Console**: Apertura Dev Tools (Cmd/Ctrl+Alt+I) in modalità sviluppo
3. **File Log**: Apertura cartella log dalle Impostazioni → Paths

## 🤝 Contributi

I contributi sono benvenuti! Per favore:

1. **Fork** il repository
2. **Crea** un branch feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. **Push** al branch (`git push origin feature/AmazingFeature`)
5. **Apri** una Pull Request

### Sviluppo Locale
```bash
# Setup ambiente
git clone https://github.com/imeandrea/imesync.git
cd imesync
npm install

# Linting
npm run lint

# Build
npm run make

# Test (se disponibili)
npm test
```

## 📄 Licenza

Questo progetto è rilasciato sotto licenza [GNU General Public License v3.0](LICENSE). Vedi il file `LICENSE` per dettagli completi.

## 🙏 Ringraziamenti

- **rsync team** per l'eccellente tool di sincronizzazione
- **Electron** per il framework cross-platform
- **React** e **TypeScript** communities
- Tutti i contributori e beta tester

## 📞 Supporto

- **Issues**: [GitHub Issues](https://github.com/imeandrea/imesync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/imeandrea/imesync/discussions)

---

**imeSync** - Sincronizzazione file semplice, potente e affidabile 🚀