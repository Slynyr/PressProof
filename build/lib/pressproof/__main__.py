from .argsHandler import ArgsHandler
from .scraper import Scraper
from .llmHandler import LLMHandler
from .logManager import LogManager
from .statusBar import StatusBar
from colorama import Fore
import os

ORANGE = "\033[38;2;255;111;60m"

mArgs = ArgsHandler.getArgs()
mScraper = Scraper(mArgs)
mLLMHandler = LLMHandler(mArgs)
mLogManager = LogManager(mArgs)
mStatusBar = StatusBar()

def mainEntryPoint():
    try: 
        proofRead()
    except KeyboardInterrupt:
        print(f"{ORANGE}[Interrupted] PressProof was interrupted. Progress saved to {mArgs.filename}.txt.{Fore.WHITE}")

    except Exception as e:
        if mArgs.debug:
            raise
        else:
            print(f"{ORANGE}Error: an unhandled exception has occured. Use the --debug argument to enable exception reporting.{Fore.WHITE}")

def proofRead():
    pageURL = mArgs.url
    pageCount = 0

    #initializing status bar
    mStatusBar.start(f"Proofreading target: {pageURL}")

    if (mArgs.dumppage):
        content = mScraper.getPageContent(mArgs.url)
        mLogManager.logString(content=content)
        os._exit(0)

    while pageURL:
        if pageCount == mArgs.maxdepth:
            reportFinish(True)
            break

        #print(f"{Fore.CYAN}[Scanning] {Fore.WHITE} Page {pageCount + 1}")
        mStatusBar.set_text(f"Proofreading target: {pageURL}")

        content = mScraper.getPageContent(pageURL)

        errors = mLLMHandler.getTextErrors(content)

        if len(errors) > 0: 
            #print(f"{Fore.CYAN}[Result] {Fore.WHITE}Found {Fore.RED}{len(errors)} errors{Fore.WHITE} at {pageURL}")
            mStatusBar.print_above(f"• Found {ORANGE}{len(errors)} errors{Fore.WHITE} on page {pageCount}")

            title = mScraper.getPageTitle(pageURL)

            mLogManager.logErrors(pageURL, title, errors)
        else:
            #print(f"{Fore.CYAN}[Result] {Fore.WHITE}No errors found on page {pageURL}")
            mStatusBar.print_above(f"• No errors found on page {pageCount}.")


        pageURL = mScraper.getNextPageURL(pageURL)
        pageCount += 1

        if not pageURL:
            reportFinish(False)
            break

def reportFinish(isInterrupted: bool):
    if isInterrupted:
        #print(f"{Fore.GREEN}[Finished] {Fore.WHITE}Reached depth limit. Total tokens used: {mLLMHandler.tokenCount}")
        mStatusBar.stop(f"{ORANGE}[Finished] {Fore.WHITE}Reached depth limit. Total tokens used: {mLLMHandler.tokenCount}")
    else:
        #print(f"{Fore.GREEN}[Finished] {Fore.WHITE}Reached end of pressbook. Total tokens used: {mLLMHandler.tokenCount}")
        mStatusBar.stop(f"{ORANGE}[Finished] {Fore.WHITE}Reached end of pressbook. Total tokens used: {mLLMHandler.tokenCount}")
