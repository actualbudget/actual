---
title: Downloads
hide_table_of_contents: true
---

<div className="container" style={{maxWidth: '800px', margin: '0 auto'}}>


import Winsvg from '../../static/img/win.svg'
import Macsvg from '../../static/img/apple.svg'
import Linuxsvg from '../../static/img/linux.svg'
import { DownloadCard } from '../components/DownloadCard'

# Downloads

The simplest way to use Actual is to download the desktop application.  This will give you access to all of Actual's budgeting features.  For a breakdown of what features require a server in addition to the base app see the [Installation Guide](/docs/install).

## Desktop Client

<div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '2rem', marginBottom: '2rem'}}>
<DownloadCard
    icon={<Winsvg width="100" height="100" fill="#6B46C1" />}
    platform="Windows"
    links={[
      {
        label: 'Microsoft Store',
        url: 'https://apps.microsoft.com/detail/9p2hmlhsdbrm?cid=actualbudget.org&mode=direct'
      },
      {
        label: 'Manual Download (x64)',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-windows-x64.exe'
      },
      {
        label: 'Manual Download (arm64)',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-windows-arm64.exe'
      },
    ]}
  />

  <DownloadCard
    icon={<Macsvg width="100" height="100" fill="#6B46C1" />}
    platform="macOS"
    links={[
      {
        label: 'Intel (x64)',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-mac-x64.dmg'
      },
      {
        label: 'Apple Silicon (arm64)',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-mac-arm64.dmg'
      }
    ]}
  />

  <DownloadCard
    icon={<Linuxsvg width="100" height="100" fill="#6B46C1" />}
    platform="Linux"
    links={[
      {
        label: 'AppImage (x64)',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-linux-x86_64.AppImage'
      },
      {
        label: 'AppImage (arm64)',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-linux-arm64.AppImage'
      },
      {
        label: 'Flatpak',
        url: 'https://github.com/actualbudget/actual/releases/latest/download/Actual-linux-x86_64.flatpak'
      }
    ]}
  />
</div>


## Server Download
Actual has two parts, the client and a sync server.  The primary task of the sync server is to sync your budget between devices, and to enable bank syncing.  We have a full write up of [if you need a server or not](/docs/install/). We also have install guides on how to set up the server in the following ways
* [PikaPods](/docs/install/pikapods)
* [Fly.io](/docs/install/fly)
* [CLI Tool](/docs/install/cli-tool)
* [Docker Install](/docs/install/docker)
* [Build from source](/docs/install/build-from-source)

</div>
