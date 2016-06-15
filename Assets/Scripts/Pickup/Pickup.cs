using UnityEngine;
using System.Collections;

public class Pickup : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbPickup;
    //Collider of the Gameobject
    [SerializeField] private BoxCollider2D boxCollider;
    //PickupIcon script attachted to this object
    [SerializeField] private PickupIcon pickupIcon;
    //SpriteRenderer of the Gameobject
    [SerializeField] private SpriteRenderer spriteRenderer;
    //Our new sprite
    [SerializeField] private Sprite chestOpen;
    
    void GiveWeapon(GameObject player)
    {
        //Play chest open sound
        SoundManager.PlayAudioClip(AudioData.Chest);

        //Get a random number to put in our player weaponlist
        PlayerWeapon playerWeapon = player.GetComponent<PlayerWeapon>();
        int randWeapon = playerWeapon.weaponList.GetRandomIndexExcluding(playerWeapon.currNumber);
        playerWeapon.SetNewWeapon(randWeapon);

        //Set our weapon icon for our chest to visualize
        pickupIcon.SetWeaponIcon(randWeapon);
    }

    
    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.ground))
            {
                rbPickup.gravityScale = 0;
                Destroy(rbPickup);
                boxCollider.isTrigger = true;
            }
        }
    }
    
    void OnTriggerEnter2D(Collider2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.player))
            {
                spriteRenderer.sprite = chestOpen;
                GiveWeapon(coll.gameObject);
                Destroy(boxCollider);
                gameObject.AddComponent<Fade>();
            }
        }
    }
}
