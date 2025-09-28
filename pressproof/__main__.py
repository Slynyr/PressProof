from .argsHandler import ArgsHandler
from .scraper import Scraper
from .llmHandler import LLMHandler
from .logManager import LogManager
from .statusBar import StatusBar
from .constants import Constants
from colorama import Fore
from datetime import datetime
import os

mArgs = ArgsHandler.getArgs()
mScraper = Scraper(mArgs)
mLLMHandler = LLMHandler(mArgs)
mLogManager = LogManager(mArgs)
mStatusBar = StatusBar()

def mainEntryPoint():
    try: 
        proofRead()
    except KeyboardInterrupt:
        print(f"{Constants.COLOR_ORANGE}[Interrupted] PressProof was interrupted. Progress saved to {mArgs.filename}.txt.{Fore.WHITE}")

    except Exception as e:
        if mArgs.debug:
            raise
        else:
            print(f"{Constants.COLOR_ORANGE}Error: an unhandled exception has occured. Use the --debug argument to enable exception reporting.{Fore.WHITE}")

def proofRead():
    pageURL = mArgs.url
    pageCount = 0
    errorCount = 0
    startTime  = datetime.now()

    #initializing status bar
    mStatusBar.start(f"Proofreading target: {pageURL}")

    if (mArgs.dumppage):
        content = mScraper.getPageContent(mArgs.url)
        mLogManager.logString(content=content)
        os._exit(0)

    while pageURL:
        if pageCount == mArgs.maxdepth:
            reportFinish(True, errorCount, startTime)
            break

        mStatusBar.set_text(f"Proofreading target: {pageURL}")

        content = mScraper.getPageContent(pageURL)

        errors = mLLMHandler.getTextErrors(content)

        if len(errors) > 0: 
            mStatusBar.print_above(f"• Found {Constants.COLOR_ORANGE}{len(errors)} errors{Fore.WHITE} on page {pageCount}")

            title = mScraper.getPageTitle(pageURL)

            mLogManager.logErrors(pageURL, title, errors)

            errorCount += len(errors)
        else:
            mStatusBar.print_above(f"• No errors found on page {pageCount}.")


        pageURL = mScraper.getNextPageURL(pageURL)
        pageCount += 1

        if not pageURL:
            reportFinish(False, errorCount, startTime)
            break

def reportFinish(isInterrupted: bool, errorCount: int, startTime):
    if isInterrupted:
        mStatusBar.stop(f"{Constants.COLOR_ORANGE}[Finished] {Fore.WHITE}Reached depth limit. Total tokens used: {mLLMHandler.tokenCount}")
        reportStats(errorCount, startTime)
    else:
        mStatusBar.stop(f"{Constants.COLOR_ORANGE}[Finished] {Fore.WHITE}Reached end of pressbook. Total tokens used: {mLLMHandler.tokenCount}")
        reportStats(errorCount, startTime)

def reportStats(errorCount, startTime):
    print(f"{Constants.COLOR_ORANGE}⮑{Fore.WHITE} TOKENS: {Constants.COLOR_ORANGE}{mLLMHandler.tokenCount}{Fore.WHITE} | ERRORS: {Constants.COLOR_ORANGE}{errorCount}{Fore.WHITE}")
    print(f"{Constants.COLOR_ORANGE}⮑{Fore.WHITE} FILE: {Constants.COLOR_ORANGE}{mArgs.filename}.txt{Fore.WHITE} | Time-Elapsed: {Constants.COLOR_ORANGE}{str(datetime.now() - startTime)}{Fore.WHITE}")