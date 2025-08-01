# Patient Management System

This is a simple patient management system built on top of [the Healthie API](https://docs.gethealthie.com).
The system allows healthcare providers to view a comprehensive list of their patients with demographic information including age, gender, ethnicity, and race.

# Usage

First, make sure you have a Healthie API key and account. If you don't have one, you can go to https://gethealthie.com/api to request access

Second, clone the repository to your computer, and install dependencies.

```bash
git clone https://github.com/healthie/healthie_sample_booking_widget.git
cd healthie_sample_booking_widget
npm install
```

Third, to enable AI-powered features, create a `.env` file in the root directory and add your API keys:

```bash
# For patient generation (required)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here

# For medical agent evaluation (optional)
REACT_APP_CLAUDE_API_KEY=your_claude_api_key_here
```

Get your API keys from:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic Claude: https://console.anthropic.com/settings/keys

Note: You can optionally provide a provider ID via URL params (e.g., `?provider_id=123`) to filter patients, though the system will show all active patients by default. 

To run the project locally, just do

```bash
npm start
```
# Deploying

By default, the root URL points to Healthie's sandbox API servers. If you want to run this patient management system against your production instance, make sure to adjust src/config/rootUrl.ts

When you are ready to deploy, you can run

```bash
npm build
```


This will generate a hostable build that can be hosted with any static website host.
We really like Netlify and S3/Cloudfront ourselves.

## Features

- View comprehensive patient list with demographic information
- Display patient age, gender, ethnicity, and race data
- **AI-Powered Patient Generation**: Uses ChatGPT to get realistic demographic distributions for specific medical conditions
- **Persistent Patient Storage**: Option to save generated patients directly to your Healthie account via API
- Generate test patients with medically accurate demographic profiles
- Clean, responsive design for easy navigation
- Real-time patient data from Healthie API
- Toggle between real and generated patient data
- Race/ethnicity data stored in patient metadata for generated patients
- **Medical Agent Evaluation**: New /evals page for testing medical decision-making agents
  - Support for OpenAI GPT-4 and Anthropic Claude models
  - Evaluate agent accuracy on differential diagnosis generation
  - Compare agent outputs against known patient conditions
  - Detailed scoring and performance metrics

## Limitations

This patient management system is meant to be a simple example and displays basic patient information.
It has simplified error handling and focuses on read-only patient data display.  


## Support
- Our website: https://gethealthie.com/
- For public issues and bugs please use the GitHub Issues Page.
- For enquiries and private issues reach out to us at hello@gethealthie.com

### Submitting a PR

We welcome any contributions! Please create an issue before submitting a pull request.

When creating a pull request, be sure to include a screenshot! 🎨

## License

MIT © Healthie Inc











