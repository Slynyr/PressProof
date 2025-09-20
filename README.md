![CLI Render](assets/example.png)
# PressProof
PressProof is a command-line tool proofreading pressbook books. Given the a starting page URL, pressbook automatically crawls through each consecutive page, extracting text and identifying errors using an LLM of choice (Restricted to OpenAI). Results are logged in realtime to a log file containing each error, the reason it was flagged, and their solutions!

## Installation & Configuration
Assuming you have python installed, run:
```
pip install git+https://github.com/Slynyr/pressbook-checker.git
```

PressProof makes use of the OpenAI API so you will need to set a ```OPENAI_API_KEY``` environment variable in order to use the tool. You can set a temporary environment variable for the terminal session as follow:
```
export OPENAI_API_KEY="<your_super_secret_key>"
```

## Example Usage 
Scanning a pressbook with default configuration:
```
pressproof --url <Starting page URL>
```

Scanning a pressbook with maximum depth depth and a custom LLM condition: 
```
pressproof --url <Starting page URL> --maddepth 10 --llmcondition <Custom condition>
pressproof --url <Starting page URL> --llmcondition "Ignore grammatical mistakes involving apostrophes" 
```

PressProof offers many more arguments that can be configured that were not directly covered above. If you would like to learn more about them and their usage, run ```pressproof --help``` in your terminal.

## Outputs
Pressproof generates a log file in the current working directory on the fly, which means you can safely interrupt the proof read at any moment. The default output is written to ```pplog.txt``` however, a custom filename can be set using the ```--filename``` argument. 

#### Output Log Format
```
===========================
| <Page Title> | <Page URL>
Error: <Original Text> | Issue : <Explenation and Solution to error>
```

## Known Issues 
- False Positives: Inline styling in some text books can cause the LLM to incorrectly identify errors with regards to extra or missing spaces

## Risk Notice ⚠️
PressProof makes use of web scraping in order to pull information from each page. While Pressbook does not explicitely prohibit web scraping in their terms of service, site policies may change, and access could be restricted at any time. 


<div style="text-align: center; max-width: 40vw; margin: 0 auto">Use this tool at your own risk. 
The author takes no responsibility for any consequences of its use.
</div>

