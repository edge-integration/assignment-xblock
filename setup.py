"""Setup for edx-sga XBlock."""

import os
from setuptools import setup, find_packages

import ev_sga


def package_data(pkg, root_list):
    """Generic function to find package_data for `pkg` under `root`."""
    data = []
    for root in root_list:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))

    return {pkg: data}

setup(
    name='ev-sga',
    version=ev_sga.__version__,
    description='ev-sga Staff Graded Assignment XBlock',
    license='Affero GNU General Public License v3 (GPLv3)',
    url="https://github.com/mitodl/ev-sga",
    author="MITx",
    zip_safe=False,
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'XBlock',
        'xblock-utils',
    ],
    entry_points={
        'xblock.v1': [
            'ev_sga = ev_sga.sga:EvGradedAssignment',
        ]
    },
    package_data=package_data("ev_sga", ["static", "templates"]),
)
