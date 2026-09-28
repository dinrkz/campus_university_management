@echo off
setlocal
pushd "%~dp0"
call "%~dp0mvnw.cmd" spring-boot:run "-Dspring-boot.run.profiles=demo"
set "campusExitCode=%ERRORLEVEL%"
popd
exit /b %campusExitCode%
