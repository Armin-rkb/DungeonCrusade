using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenuButtons : MonoBehaviour
{

   
    public delegate void BestOfEventHandler();

    public BestOfEventHandler OnPlayButton;

    public void PlayGame()
    {
        StartCoroutine("PlayButton");

        if (OnPlayButton != null)
            OnPlayButton();
    }

    /*
     * Button to use for the Main Menu's play button.
     * Starts the IEnumerator PlayButton.
     */

    public void GoToMenu()
    {
        Application.LoadLevel("Menu");
    }

    /*
     * Button to use for the game's Menu button.
     * Simply loads the Menu's scene.
     */

  
    

    private IEnumerator PlayButton()
    {

        AsyncOperation async = Application.LoadLevelAsync("SceneArmin5");


        while (!async.isDone)
            yield return null;
    }
}
