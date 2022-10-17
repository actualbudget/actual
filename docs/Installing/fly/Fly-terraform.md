---
title: 'Deploying Actual with terraform'
---

# Deploying Actual on fly.io with terraform

## Requirements

1. [Install terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli).
1. Ensure you've [installed the flyctl utility](https://fly.io/docs/flyctl/installing/) and logged
   in.
1. Copy the `terraform` subdirectory of `actual-server` [(link)][tf-dir].

## Terminal 1: Setup

1. Enter the `terraform` subdirectory of `actual-server`.
1. Log in to fly.io by running
   ```sh
   fly auth login
   ```
1. Set your fly.io API key as an evironment variable
   ```sh
   export FLY_API_TOKEN=$(fly auth token)
   ```

## Terminal 2: Open Wireguard Tunnel

1. In a separate terminal, run
   ```sh
   fly machines api-proxy
   ```
   ![image](https://user-images.githubusercontent.com/2792750/181842875-8ebe3f99-a849-49d6-bb85-133c093a4b5e.png)

   This will open a wireguard tunnel from your local machine to fly's infrastructure allowing
   terraform to access the `machines` api.

## Deploy

1. Return to terminal 1.
1. Initialize terraform by running the following command in the `terraform` directory:
   ```sh
   terraform init
   ```
1. Update the `ex.tfvars` file (or use your preferred method of variable provision), then:
   ```sh
   terraform apply -var-file=ex.tfvars
   ```
1. Review the plan, and enter `yes` if it matches expectations.

   ![image](https://user-images.githubusercontent.com/2792750/181842629-78fe6e7b-619d-4f87-90c7-7ad60357bd0f.png)

You should now have a running app! Open your [fly.io dashboard](https://fly.io/dashboard/) to
inspect any additional details.