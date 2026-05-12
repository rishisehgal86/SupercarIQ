#!/usr/bin/env python3
"""
Fix truncated serviceHistory values in static data files.
Any serviceHistory value that is not "full-ferrari", "partial", or "unknown"
gets replaced with "partial" (since all truncated values describe service work).
"""
import re
import glob
import os

VALID_VALUES = {"full-ferrari", "partial", "unknown"}
DATA_DIR = "/home/ubuntu/ferrari-812-report/client/src/data"

files = glob.glob(os.path.join(DATA_DIR, "ferrari*.ts")) + glob.glob(os.path.join(DATA_DIR, "f8*.ts"))

total_fixed = 0
for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()
    
    def fix_service_history(match):
        value = match.group(1)
        if value not in VALID_VALUES:
            return f'serviceHistory: "partial"'
        return match.group(0)
    
    new_content = re.sub(r'serviceHistory: "([^"]*)"', fix_service_history, content)
    
    if new_content != content:
        changes = content.count('serviceHistory:') - new_content.count('serviceHistory:')
        fixed = sum(1 for m in re.finditer(r'serviceHistory: "([^"]*)"', content) if m.group(1) not in VALID_VALUES)
        print(f"Fixed {fixed} serviceHistory values in {os.path.basename(filepath)}")
        total_fixed += fixed
        with open(filepath, "w") as f:
            f.write(new_content)
    else:
        print(f"No changes needed in {os.path.basename(filepath)}")

print(f"\nTotal fixed: {total_fixed}")
