from setuptools import setup, find_packages

setup(
    name="PressProof",
    version="1.0", 
    packages=find_packages(),
    install_requires=["colorama", "openai", "beautifulsoup4", "requests"],
    entry_points={
        "console_scripts": [
            "pressproof = pressproof.__main__:mainEntryPoint"
        ]
    }
)