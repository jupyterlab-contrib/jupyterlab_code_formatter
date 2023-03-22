import ast
from collections import Counter

code_snippet_1 = """# this doesn't make sense as all lul
import requests             # TROLOLOLOL

headers = {
    'Referer': 'https://www.transtats.bts.gov/DL_SelectFields.asp?Table_ID=236&DB_Short_Name=On-Time',
    'Origin': 'https://www.transtats.bts.gov',
    'Content-Type': 'application/x-www-form-urlencoded',
}

params = (
    ('Table_ID', '236'),
    ('Has_Group', '3'),    ('Is_Zipped',              '0'),
)

with open('modern-1-url.txt', encoding='utf-8') as f:
    data = f.read().strip()

os.makedirs('data',         exist_ok=True)


import pandas as pd






def read(fp):
    df = (pd.read_csv(fp)
            .rename(columns=str.lower)            .drop('unnamed: 36', axis=1)            .pipe(extract_city_name)            .pipe(time_to_datetime, ['dep_time', 'arr_time', 'crs_arr_time', 'crs_dep_time'])
            .assign(fl_date=lambda x: pd.to_datetime(x['fl_date']),
                    dest=lambda x: pd.Categorical(x['dest']),
                    origin=lambda x: pd.Categorical(x['origin']),                    tail_num=lambda x: pd.Categorical(x['tail_num']),                    unique_carrier=lambda x: pd.Categorical(x['unique_carrier']),
                    cancellation_code=lambda x: pd.Categorical(x['cancellation_code'])))
    return df


def extract_city_name(df:pd.DataFrame) ->          pd.DataFrame:
    '''
    Chicago, IL -> Chicago for origin_city_name and dest_city_name
    '''
    cols = ['origin_city_name', 'dest_city_name']
    city = df[cols].apply(lambda x: x.str.extract("(.*), \w{2}", expand=False))
    df = df.copy()
    df[['origin_city_name', 'dest_city_name']] = city
    return df

"""
code_snippet_2 = '''# this doesn't make sense as all lul
import requests  # TROLOLOLOL

headers = {
    "Referer": "https://www.transtats.bts.gov/DL_SelectFields.asp?Table_ID=236&DB_Short_Name=On-Time",
    "Origin": "https://www.transtats.bts.gov",
    "Content-Type": "application/x-www-form-urlencoded",
}

params = (
    ("Table_ID", "236"),
    ("Has_Group", "3"),
    ("Is_Zipped", "0"),
)

with open("modern-1-url.txt", encoding="utf-8") as f:
    data = f.read().strip()

os.makedirs("data", exist_ok=True)


import pandas as pd


def read(fp):
    df = (
        pd.read_csv(fp)
        .rename(columns=str.lower)
        .drop("unnamed: 36", axis=1)
        .pipe(extract_city_name)
        .pipe(time_to_datetime, ["dep_time", "arr_time", "crs_arr_time", "crs_dep_time"])
        .assign(
            fl_date=lambda x: pd.to_datetime(x["fl_date"]),
            dest=lambda x: pd.Categorical(x["dest"]),
            origin=lambda x: pd.Categorical(x["origin"]),
            tail_num=lambda x: pd.Categorical(x["tail_num"]),
            unique_carrier=lambda x: pd.Categorical(x["unique_carrier"]),
            cancellation_code=lambda x: pd.Categorical(x["cancellation_code"]),
        )
    )
    return df


def extract_city_name(df: pd.DataFrame) -> pd.DataFrame:
    """
    Chicago, IL -> Chicago for origin_city_name and dest_city_name
    """
    cols = ["origin_city_name", "dest_city_name"]
    city = df[cols].apply(lambda x: x.str.extract("(.*), \w{2}", expand=False))
    df = df.copy()
    df[["origin_city_name", "dest_city_name"]] = city
    return df
'''


tree_1 = ast.parse(code_snippet_1)
tree_2 = ast.parse(code_snippet_2)


MEH = []

class CursorPositionVisitor(ast.NodeVisitor):
    def __init__(self, cursor_position):
        self.cursor_position = cursor_position
        self.cursor_node = None
        self.cursor_path_counter = None
        self._path_counter = Counter()

    def generic_visit(self, node):
        self._path_counter[node.__class__.__name__] += 1
        if hasattr(node, 'lineno') and ((node.lineno, node.col_offset) < self.cursor_position < (node.end_lineno, node.end_col_offset)):
            self.cursor_node, self.cursor_path_counter = node, self._path_counter.copy()
            MEH.append(self._path_counter.copy())
        super().generic_visit(node)

visitor = CursorPositionVisitor((31, 14))
visitor.visit(tree_1)


class TestVisitor(ast.NodeVisitor):
    def __init__(self, target_path_counter):
        self.target_path_counter = target_path_counter
        self.new_cursor_node = None
        self.path_counter = Counter()

    def generic_visit(self, node):
        self.path_counter[node.__class__.__name__] += 1
        if self.path_counter == self.target_path_counter:
            self.new_cursor_node = node
        super().generic_visit(node)


for m in MEH:
    visitor2 = TestVisitor(m)
    visitor2.visit(tree_2)
    print(visitor2.new_cursor_node.lineno, visitor2.new_cursor_node.col_offset)
