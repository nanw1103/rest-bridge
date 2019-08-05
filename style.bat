@echo off
REM npm i -g eslint
call eslint --fix --ignore-path .gitignore .
pause