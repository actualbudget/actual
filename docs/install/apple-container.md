---
title: 'Apple Container'
---

Apple Container is a tool for creating and running Linux containers using lightweight virtual machines on macOS. It's written in Swift and optimized for Apple silicon, providing a native containerization solution for Mac users.

## Prerequisites

- The first thing you must do is to install Apple Container on your Mac. You can install it from [Apple's container repository](https://github.com/apple/container).
- macOS with Apple silicon (M1/M2/M3) for optimal performance.
- Basic familiarity with command-line operations.

## Setup and Installation

### Start the Container Service

First, start the Apple Container service:

```bash
$ container system start
```

If this is your first time running Apple Container, it may prompt you to install a Linux kernel. Follow the installation prompts to complete the setup.

### Configure DNS (Optional but Recommended)

Setting up DNS makes it easier to access your containers with friendly names:

```bash
# Create a DNS name (e.g., "local")
$ sudo container system dns create local

# Set it as the default DNS
$ container system dns default set local
```

## Running Actual Budget with Apple Container

### Prepare the Data Directory

Create a directory to store your Actual budget data files:

```bash
$ mkdir -p ~/Documents/actual
```

### Launch the Actual Budget Container

Run the Actual server container using the official Docker image:

```bash
$ container run --name actual \
  --mount source=${HOME}/Documents/actual,target=/data \
  --detach \
  --rm \
  docker.io/actualbudget/actual-server:latest
```

**Command breakdown:**
- `--name actual` - Names the container *actual*.
- `--mount` - Mounts your local directory to persist data.
- `--detach` - Runs the container in the background. First time you start the Actual Budget container you may want to not use this option to see if Actual is running as expected.
- `--rm` - Automatically removes the container when stopped.

### Accessing Actual Budget

Once the container is running, open your web browser and navigate to:

- `http://actual.local:5006` *(if using DNS setup)*
- `http://ip-addr:5006` *(if not using DNS, ip addr can be found by entering `container list --all`)*

:::caution
The first time accessing Actual, you will see a "Fatal Error" regarding the `SharedArrayBuffer`. Select *Advanced Options* > Check the checkbox > Select *Open Actual*.
:::

## Managing Your Container

### Check Container Status

View running containers:

```bash
$ container list --all
```

Refer to the `STATE` column to view the status of the actual container.

### Stopping the Container

To stop the Actual container, run the following command:

```bash
$ container stop actual
```

## Apple Container System Management

### Stopping the Container Service

When you're done using containers, you can stop the service utilizing the following command:

```bash
$ container system stop
```

## Troubleshooting

If you encounter issues:

1. **Container won't start**: Ensure the Apple Container service is running using the `container system start` command.
2. **Port conflicts**: Make sure another application isn't using port 5006.
3. **Data persistence**: Verify that the mount path exists and has proper permissions.
4. **Network access**: Check if your local firewall is blocking the connection.

For more detailed troubleshooting, consult the [Apple Container documentation](https://github.com/apple/container/).