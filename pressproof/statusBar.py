import sys
import time
import threading
import itertools
import atexit
import signal
import re
from colorama import Fore, Style, just_fix_windows_console
from .constants import Constants

_ANSI_RE = re.compile(r'\x1b\[[0-9;?]*[ -/]*[@-~]')

def _visible_len(s: str) -> int:
    return len(_ANSI_RE.sub('', s))

class StatusBar:
    def __init__(self, frames="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏", interval=0.055):
        self.frames = frames
        self.interval = interval
        self._text = ""
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._thread = None
        self._hidden_cursor = False
        self._prev_vis_len = 0
        self._started = False
        just_fix_windows_console()

        # Ensure cursor shows on process exit.
        atexit.register(self._show_cursor)

    def _hide_cursor(self):
        if not self._hidden_cursor:
            sys.stdout.write("\033[?25l")
            sys.stdout.flush()
            self._hidden_cursor = True

    def _show_cursor(self):
        if self._hidden_cursor:
            sys.stdout.write("\033[?25h")
            sys.stdout.flush()
            self._hidden_cursor = False

    def _erase_line(self):
        sys.stdout.write("\r\033[2K")
        sys.stdout.flush()
        self._prev_vis_len = 0

    def start(self, text=""):
        with self._lock:
            self._text = text
            if self._started:
                return
            self._started = True

        self._stop.clear()
        self._hide_cursor()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

        # Clean up the bar on normal exit.
        atexit.register(self.stop)

        # Install SIGINT handler only from main thread.
        if threading.current_thread() is threading.main_thread():
            prev = signal.getsignal(signal.SIGINT)
            signal.signal(signal.SIGINT, self._sigint_wrapper(prev))

    def _sigint_wrapper(self, prev):
        def handler(sig, frame):
            self.stop()
            if callable(prev):
                prev(sig, frame)
            else:
                raise KeyboardInterrupt
        return handler

    def _render_line(self, frame: str) -> str:
        return f"{Constants.COLOR_ORANGE}\033[1m{frame}\033[0m{Fore.WHITE} {self._text}{Style.RESET_ALL}"

    def _loop(self):
        for frame in itertools.cycle(self.frames):
            if self._stop.is_set():
                break
            with self._lock:
                line = self._render_line(frame)
                vis_len = _visible_len(line)

            sys.stdout.write("\r")
            sys.stdout.write(line)

            if vis_len < self._prev_vis_len:
                sys.stdout.write(" " * (self._prev_vis_len - vis_len))
                # Move back to end of new content (optional; we already wrote it).
                sys.stdout.write("\r")
                sys.stdout.write(line)

            sys.stdout.flush()
            self._prev_vis_len = vis_len
            time.sleep(self.interval)

    def set_text(self, text):
        with self._lock:
            self._text = text

    def print_above(self, msg):
        self._erase_line()
        print(msg)
        
        if self._thread and self._thread.is_alive():
            with self._lock:
                line = self._render_line(self.frames[0])
                self._prev_vis_len = 0  
            sys.stdout.write("\r" + line)
            sys.stdout.flush()
            self._prev_vis_len = _visible_len(line)

    def stop(self, final_text=None):
        if self._thread and self._thread.is_alive():
            self._stop.set()
            self._thread.join(timeout=0.5)

        if final_text is not None:
            self._erase_line()
            print(final_text)

        self._erase_line()
        self._show_cursor()
        with self._lock:
            self._started = False
            self._thread = None
