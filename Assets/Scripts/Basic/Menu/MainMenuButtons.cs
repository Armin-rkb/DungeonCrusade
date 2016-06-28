using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenuButtons : MonoBehaviour
{
    [SerializeField]
    private StageSelection _stageSelection;
   
    public delegate void BestOfEventHandler();

    public BestOfEventHandler OnPlayButton;

    public BestOfEventHandler OnDungeonButton;
    public BestOfEventHandler OnBeachButton;
    public BestOfEventHandler OnDragonButton;

    void Awake()
    {
        _stageSelection.OnDungeonSelect += DungeonLevel;
        _stageSelection.OnBeachSelect += BeachLevel;
        _stageSelection.OnDragonSelect += DragonLevel;
    }

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

    public void DragonLevel()
    {
        if (OnPlayButton != null)
            OnPlayButton();

        if (OnDragonButton != null)
            OnDragonButton();
    }

    /*
     * Button to use for the Main Menu's play button.
     * Starts the IEnumerator PlayButton.
     */


  
}
