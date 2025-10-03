![CLI Render](assets/uirender.png)
# PressProof
PressProof is a command-line tool designed for proofreading pressbook books. Given the a starting page URL, pressbook automatically crawls through each consecutive page, extracting text and identifying errors using an LLM of choice (restricted to OpenAI). Results are logged in realtime to a log file containing each error, the reason it was flagged, and their solutions!

## Installation & Configuration
Assuming you have python installed, run:
```
pip install pressproof
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
**Sidenote:** If you pass in the table of contents as the first page, PressProof will not automatically detect the next page. Only pass in the first page onwards. 


Scanning a pressbook with maximum depth depth and a custom LLM condition: 
```
pressproof --url <Starting page URL> --maddepth 10 --llmcondition <Custom condition>
pressproof --url https://ecampusontario.pressbooks.pub/auditinginformationsystems/chapter/0101/ --maxdepth 10 --llmcondition "Ignore grammatical mistakes involving apostrophes" 
```

PressProof offers many more arguments that can be configured that were not directly covered above. If you would like to learn more about them and their usage, run ```pressproof --help``` in your terminal.

## Custom Rules and LLM Conditions
If you would like to tune how you strict PressProof is, ignore certain types or errors, or only search for specific issues, PressProof provides an ```--llmcondition``` parameter. It is important to not however, that due to context window limitations, the default **gpt-4o-mini** model has a hard time following custom rules/conditions. It is recommended that you use a more advanced model such as **gpt-4.1** via ```--model "gpt-4.1"```. Do note that this does bring the price/proofread up significantly. 

As shown in the example below, each condition should be seperated by a return carraige ```\n```. 
```
PressProof --url https://ecampusontario.pressbooks.pub/auditinginformationsystems/chapter/0101/ --llmcondition "ONLY flag issues that change meaning or area clearly wrong\n IGNORE ALL issues about punctuation of dates, years, or decades (e.g. 1990s, 1990's)"
```

## Outputs
Pressproof generates a log file in the current working directory on the fly, which means you can safely interrupt the proof read at any moment. The default output is written to ```pplog.txt``` however, a custom filename can be set using the ```--filename``` argument. 

#### Output Log Format
```
===========================
| <Page Title> | <Page URL>
Quote: <Original Text> | Issue : <Explenation and Solution to error>
```

## Risk Notice ⚠️
PressProof makes use of web scraping in order to pull information from each page. While Pressbook does not explicitely prohibit web scraping in their terms of service, site policies may change, and access could be restricted at any time. 


<div style="text-align: center; max-width: 40vw; margin: 0 auto">Use this tool at your own risk. 
The author takes no responsibility for any consequences of its use.
</div>

