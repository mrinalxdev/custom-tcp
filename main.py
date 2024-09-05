import argparse
import os
import json
import shutil

class PackageManager:
    def __init__(self):
        self.packages_dir = os.path.expanduser("~/.mypackages")
        self.db_file = os.path.join(self.packages_dir, "packages.json")
        self.ensure_package_dir()

    def ensure_package_dir(self):
        os.makedirs(self.packages_dir, exist_ok=True)
        if not os.path.exists(self.db_file):
            with open(self.db_file, "w") as f:
                json.dump({}, f)

    def install(self, package_name, url):
        packages = self.get_packages()
        if package_name in packages:
            print(f"{package_name} is already installed.")
            return

        # Here you would implement the actual download and installation logic
        print(f"Installing {package_name} from {url}")
        packages[package_name] = {"url": url}
        self.save_packages(packages)

    def remove(self, package_name):
        packages = self.get_packages()
        if package_name not in packages:
            print(f"{package_name} is not installed.")
            return

        # Here you would implement the actual removal logic
        print(f"Removing {package_name}")
        del packages[package_name]
        self.save_packages(packages)

    def list(self):
        packages = self.get_packages()
        if not packages:
            print("No packages installed.")
        else:
            for name, info in packages.items():
                print(f"{name}: {info['url']}")

    def get_packages(self):
        with open(self.db_file, "r") as f:
            return json.load(f)

    def save_packages(self, packages):
        with open(self.db_file, "w") as f:
            json.dump(packages, f, indent=2)

def main():
    parser = argparse.ArgumentParser(description="A Homebrew-like package manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    install_parser = subparsers.add_parser("install", help="Install a package")
    install_parser.add_argument("package", help="Name of the package to install")
    install_parser.add_argument("url", help="URL to download the package from")

    remove_parser = subparsers.add_parser("remove", help="Remove a package")
    remove_parser.add_argument("package", help="Name of the package to remove")

    list_parser = subparsers.add_parser("list", help="List installed packages")

    args = parser.parse_args()
    pm = PackageManager()

    if args.command == "install":
        pm.install(args.package, args.url)
    elif args.command == "remove":
        pm.remove(args.package)
    elif args.command == "list":
        pm.list()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
