from setuptools import setup, find_packages

with open("README.md", "r") as f: 
    description = f.read()
    description.replace("assets/example.png", "https://github.com/Slynyr/PressProof/raw/main/assets/example.png")

setup(
    name="PressProof",
    version="1.1.2", 
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