from setuptools import setup, find_packages
from pathlib import Path

readme_path = Path(__file__).with_name("README.md")
description = readme_path.read_text(encoding="utf-8")
description = description.replace(
    "assets/uirender.png",
    "https://github.com/Slynyr/PressProof/raw/main/assets/uirender.png"
)

setup(
    name="PressProof",
    version="1.2.0", 
    packages=find_packages(),
    install_requires=["colorama", "openai", "beautifulsoup4", "requests"],
    entry_points={
        "console_scripts": [
            "pressproof = pressproof.__main__:mainEntryPoint"
        ]
    }, 
    long_description=description,
    long_description_content_type="text/markdown"
)