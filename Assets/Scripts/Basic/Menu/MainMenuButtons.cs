using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenuButtons : MonoBehaviour
{

   
    public delegate void BestOfEventHandler();

    public BestOfEventHandler OnPlayButton;

    public BestOfEventHandler OnDungeonButton;
    public BestOfEventHandler OnBeachButton;

    public void DungeonLevel()
    {
        if (OnPlayButton != null)
            OnPlayButton();        


        if (OnDungeonButton != null)
            OnDungeonButton();        
    }


    public void BeachLevel()
    {
        if (OnPlayButton != null)
            OnPlayButton();        

        if (OnBeachButton != null)
            OnBeachButton();
    }

    /*
     * Button to use for the Main Menu's play button.
     * Starts the IEnumerator PlayButton.
     */


  
}
