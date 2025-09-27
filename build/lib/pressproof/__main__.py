from .argsHandler import ArgsHandler
from .scraper import Scraper
from .llmHandler import LLMHandler
from .logManager import LogManager
from colorama import Fore
import os

mArgs = ArgsHandler.getArgs()
mScraper = Scraper(mArgs)
mLLMHandler = LLMHandler(mArgs)
mLogManager = LogManager(mArgs)

def mainEntryPoint():
    try: 
        proofRead()
    except KeyboardInterrupt:
        print(f"{Fore.RED}[Interrupted] PressProof was interrupted. Progress saved to {mArgs.filename}.txt.{Fore.WHITE}")

    except Exception as e:
        if mArgs.debug:
            raise
        else:
            print(f"{Fore.RED}Error: an unhandled exception has occured. Use the --debug argument to enable exception reporting.{Fore.WHITE}")

def proofRead():
    pageURL = mArgs.url
    pageCount = 0

    if (mArgs.dumppage):
        content = mScraper.getPageContent(mArgs.url)
        mLogManager.logString(content=content)
        os._exit(0)

    while pageURL:
        if pageCount == mArgs.maxdepth:
            reportFinish(True)
            break

        print(f"{Fore.CYAN}[Scanning] {Fore.WHITE} Page {pageCount + 1}")

        content = mScraper.getPageContent(pageURL)

        errors = mLLMHandler.getTextErrors(content)

        if len(errors) > 0: 
            print(f"{Fore.CYAN}[Result] {Fore.WHITE}Found {Fore.RED}{len(errors)} errors{Fore.WHITE} at {pageURL}")

            title = mScraper.getPageTitle(pageURL)

            mLogManager.logErrors(pageURL, title, errors)
        else:
            print(f"{Fore.CYAN}[Result] {Fore.WHITE}No errors found on page {pageURL}")

        pageURL = mScraper.getNextPageURL(pageURL)
        pageCount += 1

        if not pageURL:
            reportFinish(False)
            break

def reportFinish(isInterrupted: bool):
    if isInterrupted:
        print(f"{Fore.GREEN}[Finished] {Fore.WHITE}Reached depth limit. Total tokens used: {mLLMHandler.tokenCount}")
    else:
        print(f"{Fore.GREEN}[Finished] {Fore.WHITE}Reached end of pressbook. Total tokens used: {mLLMHandler.tokenCount}")