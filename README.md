
![Home Page](images/homepage.png)
![Audit Page](images/auditpage.png)

# PressProof

An open source proofreading tool designed for proofreading pressbook books. Given the base url of any book, PressProof automatically crawls through each page, extracting text, and identifying errors using your LLM of choice (Currently restricted to OpenAI and Claude models). The tool then displays each issue along with a short description, the suggested fix, confidence, and severity.  

## Setup and Usage
Download the respective build for your operating system from the latest pressproof release. Upon launching the app, you will be given the option to create a new audit. Before we can do so, please first navigate to `Manage API Keys` and add API keys for your LLM provider of choice. With that in place, you may simply provide the URL

### Models
Pressproof now offers a range of models from both OpenAI and Claude, each with their own benefits as detailed below. 


| Company | Model | Description | Tested |
| :--: | :--: | :-- | :--: |
| OpenAI | GPT-4o | Great for extensive proof reads but is significantly more expensive. Ideally used for final extensive proof reads. | ✅ |
| OpenAI | GPT-4o Mini | Works well and is extremely cost effective however, it may not be as thourough as the non-mini model. | ✅ | 
| Claude |  Sonnet 4 | Performance and accuracy for this model has not fully been tested yet | ❌ |
| Claude | Sonnet 3.5 | Performance and accuracy for this model has not fully been tested yet | ❌ |

## Build PressProof
Running and building the app from source can be done like so.

```bash
cd pressproof
```

```bash
#Building app from source
npm install .
npm run dev
```


```bash
#Build distributables for macOS and Windows
npm run build:mac
npm run build:win
```

## Legacy CLI Tool
PressProof was originally a command line tool which can now be found here. Although the feature set and functionality is similar, the CLI version does not have some of the performance and accuracy improvements that this version has.