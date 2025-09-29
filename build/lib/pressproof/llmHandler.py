import os 
import json
import re
from openai import OpenAI
from colorama import Fore

base = (
  "You are a precise proofreading assistant that is looking major spelling mistakes or critical errors in a textbook page.\n"
)

output = (
  "Return ONLY JSON with a top-level key 'errors' (array of objects with 'snippet' and 'issue')."
)

class LLMHandler:
    def __init__(self, args):
        self.args = args
        self.client = OpenAI(api_key=getattr(args, "apikey", os.getenv("OPENAI_API_KEY")))
        self.tokenCount = 0

    def getTextErrors(self, text: str):
        payload = text[:9000] if text else ""

        try:
            resp = self.client.chat.completions.create(
                model=self.args.model,
                temperature=0,
                
                response_format={"type": "json_object"},
                messages = [
                    {"role": "system", "content": base},
                    {"role": "system", "content": self.args.llmcondition or ""},
                    {"role": "system", "content": output},
                    {"role": "user", "content": f"Text to check:\n\n{payload}"},
                ],
            )
            content = resp.choices[0].message.content or ""

            if hasattr(resp, "usage") and resp.usage:
                self.tokenCount += resp.usage.total_tokens
                
        except Exception as e:
            print("OpenAI call failed:", str(e))
            return []

        try:
            obj = json.loads(content)
            items = obj.get("errors", [])
            # validate shape
            out = []
            for it in items:
                snip = (it or {}).get("snippet")
                issue = (it or {}).get("issue")
                if isinstance(snip, str) and isinstance(issue, str):
                    out.append({"snippet": snip, "issue": issue})
            return out
        except Exception:
            m_obj = re.search(r'\{[\s\S]*\}', content)
            m_arr = re.search(r'\[[\s\S]*\]', content)
            raw = m_obj.group(0) if m_obj else (m_arr.group(0) if m_arr else "")
            if not raw:
                print("Model returned non-JSON content:\n", content[:500], "...")
                return []
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict) and "errors" in parsed:
                    items = parsed.get("errors") or []
                elif isinstance(parsed, list):
                    items = parsed
                else:
                    items = []
                out = []
                for it in items:
                    snip = (it or {}).get("snippet")
                    issue = (it or {}).get("issue")
                    if isinstance(snip, str) and isinstance(issue, str):
                        out.append({"snippet": snip, "issue": issue})
                return out
            except Exception as e:
                print("JSON parse failed:", str(e), "\nRaw content preview:\n", content[:500], "...")
                return []