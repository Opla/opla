CHANGED=$(git diff --name-only -- bin)
if [[ -z "${CHANGED}" ]]
then
      echo "No change."
      echo $CHANGED
      exit 0
else
      echo "Changed."
      echo $CHANGED
      exit 1
fi