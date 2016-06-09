using UnityEngine;
using System.Collections;

public class MatchButtons : MonoBehaviour {

    public void RestartButton()
    {
        Application.LoadLevel(Application.loadedLevelName);
    }

    public void MainMenu()
    {
        Application.LoadLevel("Menu");
    }
}
