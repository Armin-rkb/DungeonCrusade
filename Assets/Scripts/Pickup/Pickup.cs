using UnityEngine;
using System.Collections;

public class Pickup : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbPickup;
    //Collider of the Gameobject
    [SerializeField] private BoxCollider2D boxCollider;
    //SpriteRenderer of the Gameobject
    [SerializeField] private SpriteRenderer spriteRenderer;
    //Our new sprite
    [SerializeField] private Sprite chestOpen;

    void GiveWeapon(GameObject player)
    {
        //Get a random number to put in our player weaponlist
        int randomWeapon = Random.Range(1, 7);
        PlayerWeapon playerWeapon = player.GetComponent<PlayerWeapon>();

        //When we get the same number in the list we will choose the default weapon: 0
        if (playerWeapon.currNumber == randomWeapon)
            randomWeapon = 0;
        
        playerWeapon.SetNewWeapon(randomWeapon);
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
