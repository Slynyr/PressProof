import argparse
import os
import sys
from colorama import Fore

class ArgsHandler: 
    def getArgs():
        parser = argparse.ArgumentParser(description="An error checking tool designed to be used with pressbook")
        parser.add_argument("--url", type=str, required=True, help="URL of pressbook page from which to start scanning.")
        parser.add_argument("--useragent", type=str, default="Mozilla/5.0 (compatible; PressbooksScraper/1.0; +https://example.com/bot)", help="User agent used by web scraper.")
        parser.add_argument("--model", type=str, default="gpt-4o-mini",help="OpenAI model to be used for proof reading.")
        parser.add_argument("--llmcondition", type=str, default="", help="Allows you to inject a custom string condition into the LLM prompt used to proof read content.")
        parser.add_argument("--filename", type=str, default="pplog", help="Filename of the output (Do not include file extension)")
        parser.add_argument("--maxdepth", type=int, default=-1, help="The maximum amount of pages the scraper is allowed cover. Off by default!")
        parser.add_argument("--debug", action="store_true", help="Enables exception reporting in terminal.")
        args = parser.parse_args()

        #Loading environment variables
        apiKey = os.getenv("OPENAI_API_KEY") 
        if not apiKey:
            sys,exit(f"{Fore.RED}[ERROR] No OpenAI API key found. Please set an 'OPEN_AI_KEY' environment variable to proceed!")
        args.apiKey = apiKey

        return args


